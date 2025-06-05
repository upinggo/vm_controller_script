# vm_controller_script
# Remote VM Command Runner (TypeScript)

A robust TypeScript script for connecting to remote virtual machines (VMs) via SSH and executing a series of commands with real-time output streaming.

## Features

- 🔒 Secure SSH connections with password or private key authentication
- ⚡ Real-time command output streaming
- 🔄 Sequential command execution with error handling
- 📝 Configurable command sequences
- ⏱️ Connection timeout handling
- 🚦 Exit code tracking for executed commands

## Prerequisites

- Node.js (v14 or higher)
- TypeScript (install globally with `npm install -g typescript`)
- SSH access to your remote VM

## Installation

1. Clone this repository:
```bash
git clone https://github.com/yourusername/remote-vm-runner.git
cd remote-vm-runner
```

2. Install dependencies:
```bash
npm install
```

## Configuration

Edit the `src/index.ts` file to configure your connection:

```typescript
const connectionConfig = {
  host: 'your.vm.ip.address',  // Replace with your VM's IP/hostname
  port: 22,                    // Default SSH port
  username: 'vm_username',      // SSH username
  password: 'your_password',   // Password authentication
  // OR use private key:
  // privateKey: require('fs').readFileSync('/path/to/private/key')
};
```

Customize the commands to execute:
```typescript
const commands = [
  'echo "--- System Info ---"',
  'uname -a',
  'echo "\n--- Disk Space ---"',
  'df -h',
  'echo "\n--- Checking Service Status ---"',
  'sudo systemctl status sshd',
  // Add your custom commands here
];
```

## Usage

Run the script:
```bash
npx ts-node src/index.ts
```

### Environment Variables (Recommended)

For better security, use environment variables instead of hard-coding credentials:

1. Create a `.env` file:
```env
SSH_HOST=your.vm.ip.address
SSH_USER=vm_username
SSH_PASSWORD=your_password
# OR for key-based auth:
# SSH_KEY_PATH=/path/to/private/key
```

2. Update the configuration:
```typescript
import * as dotenv from 'dotenv';
dotenv.config();

const connectionConfig = {
  host: process.env.SSH_HOST,
  port: 22,
  username: process.env.SSH_USER,
  password: process.env.SSH_PASSWORD,
  // OR: privateKey: require('fs').readFileSync(process.env.SSH_KEY_PATH || '')
};
```

## Security Best Practices

1. **Use SSH Keys** instead of passwords when possible
2. **Never commit credentials** to version control
3. Add `.env` to your `.gitignore` file
4. Use a dedicated SSH user with limited privileges
5. Set appropriate file permissions for private keys:
```bash
chmod 600 /path/to/private/key
```

## Customization

### Add More Commands

Modify the `commands` array to include your specific operations:
```typescript
const commands = [
  'docker ps -a',              // List Docker containers
  'nvidia-smi',                // Check GPU status
  'tail -n 100 /var/log/syslog', // View system logs
  'git pull && npm install',   // Update and install dependencies
];
```

### Adjust Timeout Settings

Add a connection timeout to the configuration:
```typescript
conn.connect({
  ...connectionConfig,
  readyTimeout: 10000 // 10 seconds
});
```

### Handle Different Exit Strategies

Modify the command execution flow to handle errors differently:
```typescript
conn.exec(cmd, (err, stream) => {
  if (err) {
    console.error(`Critical error on command: ${cmd}`, err.message);
    return conn.end(); // Terminate connection on critical errors
  }
  // ...
});
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| `Connection timeout` | Verify network connectivity and firewall settings |
| `Authentication failure` | Double-check credentials or key permissions |
| `Command not found` | Ensure command exists on remote system |
| `Permission denied` | Run commands with `sudo` or adjust user permissions |

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.