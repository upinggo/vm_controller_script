import * as dotenv from 'dotenv';
import { Client } from 'ssh2';
import { execSync } from "child_process";
import * as fs from 'fs';
import minimist from "minimist";

dotenv.config();

const connectionConfig = {
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
  privateKey: process.env.SSH_KEY_PATH ? fs.readFileSync(process.env.SSH_KEY_PATH) : undefined
};
const argv = minimist(process.argv.slice(2));
const branchName = argv.b || argv._[0] || process.env.BRANCH || 'main';
console.log(`Branch name: ${branchName}`);
const commands = [
  `cd ${process.env.REPO_PATH} && git fetch --all && git checkout ${branchName} && git reset --hard origin/${branchName} && git pull`,
  `npm --prefix ${process.env.REPO_PATH} install`,
  `npm --prefix ${process.env.REPO_PATH} run deploy:umbrella ${process.env.HANA_CONTAINER} ${process.env.OPTIONS ? '-- ' + process.env.OPTIONS : ''}`,
];
const conn = new Client();
function connectCFShell(conn: Client) {
  let cfLoginCommand = process.env.CFLoginCommand || 'cf login';
  conn.shell((err, stream) => {
    if (err) {
      console.error('Error starting shell:', err);
      return;
    }

    stream.write('cf oauth-token\n',
      () => {
        stream.stdout.on('data', (data: any) => {
          console.log('Checking Cloud Foundry login status..., data:', data.toString());
          if (data.toString().includes('FAILED')) {
            console.warn('Not logged in to Cloud Foundry, executing login command...');
            stream.write(cfLoginCommand + '\n', () => {
              // Enable raw mode for interactive input
              process.stdin.setRawMode(true);
              //  process.stdin.resume();

              let inputBuffer = '';

              // Handle user input
              process.stdin.on('data', (data: Buffer) => {
                const input = data.toString();
                // Check for termination conditions
                if (input === '\u0004') { // Ctrl+D
                  console.log(`Sending command: ${inputBuffer}`);
                  stream.write(inputBuffer + '\n');
                  inputBuffer = '';
                  stream.pipe(stream.stdout); // Pipe stream output to stdout
                  stream.close()
                } else {
                  inputBuffer += input;
                }
              });


              // Handle shell closure
              stream.on('close', () => {
                console.log('Shell session closed');
                process.stdin.setRawMode(false); // Disable raw mode
                //  process.stdin.pause(); // Stop listening for input
              }).on('data', (data: any) => {
                console.log(`Shell STDOUT: ${data}`);
              });
            });
          }
        });
      }
    );
  });
}

conn.on('ready', () => {
  console.log('Client :: ready');
  connectCFShell(conn);
  executeCommands(conn, commands);
}).on('error', (err) => {
  console.error('Connection Error:', err);
}).connect(connectionConfig);

function executeCommands(conn: Client, commands: string[]) {
  let index = 0;

  const nextCommand = () => {
    if (index >= commands.length) {
      console.log('All commands executed. Closing connection.');
      conn.end();
      return;
    }

    const cmd = commands[index++];
    console.log(`Executing: ${cmd}`);

    conn.exec(`bash --login -c "${cmd}"`, (err, stream) => {
      if (err) {
        console.error(`Error executing command: ${cmd}`, err);
        return nextCommand();
      }

      stream.on('close', (code: string | null, signal: string | null) => {
        console.log(`Command ${cmd} closed with code ${code} and signal ${signal}`);
        nextCommand();
      }).on('data', (data: any) => {
        console.log(`STDOUT: ${data}`);
      }).stderr.on('data', (data) => {
        console.error(`STDERR: ${data}`);
      });
    });
  };

  nextCommand();
}
