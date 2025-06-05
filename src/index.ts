import * as dotenv from 'dotenv';
import { Client } from 'ssh2';
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
  `cd ${process.env.REPO_PATH} && git fetch --all && git checkout ${branchName} && git reset --hard origin/${branchName}`,
  `npm --prefix ${process.env.REPO_PATH} install`,
  `npm --prefix ${process.env.REPO_PATH} run deploy:umbrella ${process.env.HANA_CONTAINER} ${process.env.OPTIONS ? '-- ' + process.env.OPTIONS : ''}`,
];
const conn = new Client();

conn.on('ready', () => {
  console.log('Client :: ready');
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
