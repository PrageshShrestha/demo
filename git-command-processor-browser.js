// Browser-compatible version of git-command-processor.js

class GitCommandProcessor {
    constructor() {
        // Clear localStorage on refresh to start fresh
        this.clearStorageOnRefresh();
        
        this.timeline = new GitTimeline();
        this.terminalOutput = [];
        this.storageKey = 'git-timeline-data';
        
        // Session-specific data
        this.sessionData = {
            localFiles: [
                'index.html',
                'style.css',
                'script.js',
                'app.js',
                'utils.js',
                'main.py',
                'app.py',
                'utils.py',
                'components.tsx',
                'App.tsx',
                'index.tsx',
                'README.md',
                'package.json',
                '.gitignore'
            ],
            stagedFiles: [], // Files currently in staging area
            committedFiles: [], // Files that have been committed
            lastBranchName: 'feature',
            lastFileName: 'app.js',
            lastRemoteUrl: 'https://github.com/user/repo.git',
            lastCommitMessage: 'Update files',
            lastUserName: 'John Doe',
            lastUserEmail: 'john@example.com'
        };
        
        this.loadTimeline();
    }
    
    clearStorageOnRefresh() {
        // Clear all Git-related localStorage items to start fresh
        const keysToRemove = [
            'git-timeline-data',
            'git-repository-exists'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
    }

    getLocalFiles() {
        return this.sessionData.localFiles;
    }
    
    updateSessionData(key, value) {
        this.sessionData[key] = value;
    }

    async processCommand(command) {
        const trimmedCommand = command.trim();
        if (!trimmedCommand) return;

        console.log('Processing command:', trimmedCommand);
        this.addTerminalOutput(`$ ${trimmedCommand}`, 'command');

        try {
            // Check if .git directory exists (except for git init, git clone, and git config)
            if (!trimmedCommand.startsWith('git init') && 
                !trimmedCommand.startsWith('git clone') && 
                !trimmedCommand.startsWith('git config')) {
                if (!this.hasGitRepository()) {
                    console.log('No git repository found');
                    this.addTerminalOutput('fatal: not a git repository (or any of the parent directories): .git', 'error');
                    return;
                }
            }

            const parts = trimmedCommand.split(' ');
            const mainCommand = parts[1];
            
            console.log('Main command:', mainCommand);
            console.log('Parts:', parts);

            let commandSuccess = false;
            let commandData = {};

            switch (mainCommand) {
                case 'init':
                    console.log('Handling init');
                    commandSuccess = await this.handleInit(parts);
                    commandData = { type: 'init', message: 'Initialized repository' };
                    break;
                case 'clone':
                    console.log('Handling clone');
                    commandSuccess = await this.handleClone(parts);
                    commandData = { type: 'clone', message: 'Cloned repository' };
                    break;
                case 'add':
                    console.log('Handling add');
                    commandSuccess = await this.handleAdd(parts);
                    commandData = { type: 'add', message: 'Added files to staging' };
                    break;
                case 'commit':
                    console.log('Handling commit');
                    commandSuccess = await this.handleCommit(parts);
                    if (commandSuccess && commandSuccess !== false) {
                        commandData = { 
                            type: 'commit', 
                            message: 'Committed changes',
                            ...commandSuccess
                        };
                    } else {
                        commandData = { type: 'commit', message: 'Committed changes' };
                    }
                    break;
                case 'branch':
                    console.log('Handling branch');
                    commandSuccess = await this.handleBranch(parts);
                    commandData = { type: 'branch', message: 'Branch operation' };
                    break;
                case 'switch':
                    console.log('Handling switch');
                    const targetNodeId = await this.handleSwitch(parts);
                    commandSuccess = targetNodeId !== null; // Success if we got a target node
                    const targetBranch = parts[2]; // Get the target branch
                    commandData = { 
                        type: 'switch', 
                        message: 'Switched branch',
                        branch: targetBranch, // Store the target branch
                        targetNodeId: targetNodeId // Store the target node ID for edge creation
                    };
                    break;
                case 'merge':
                    console.log('Handling merge');
                    commandSuccess = await this.handleMerge(parts);
                    commandData = { type: 'merge', message: 'Merged branches' };
                    break;
                case 'remote':
                    console.log('Handling remote');
                    commandSuccess = await this.handleRemote(parts);
                    commandData = { type: 'remote', message: 'Remote operation' };
                    break;
                case 'pull':
                    console.log('Handling pull');
                    commandSuccess = await this.handlePull(parts);
                    commandData = { type: 'pull', message: 'Pulled changes' };
                    break;
                case 'push':
                    console.log('Handling push');
                    commandSuccess = await this.handlePush(parts);
                    commandData = { type: 'push', message: 'Pushed changes' };
                    break;
                case 'config':
                    console.log('Handling config');
                    commandSuccess = await this.handleConfig(parts);
                    commandData = { type: 'config', message: 'Configuration updated' };
                    break;
                case 'log':
                    console.log('Handling log');
                    commandSuccess = await this.handleLog(parts);
                    commandData = { type: 'log', message: 'Viewed log' };
                    break;
                case 'reset':
                    console.log('Handling reset');
                    commandSuccess = await this.handleReset(parts);
                    commandData = { type: 'reset', message: 'Reset changes' };
                    break;
                case 'status':
                    console.log('Handling status');
                    commandSuccess = await this.handleStatus(parts);
                    commandData = { type: 'status', message: 'Checked status' };
                    break;
                default:
                    console.log('Unknown command:', mainCommand);
                    this.addTerminalOutput(`git: '${mainCommand}' is not a git command. See 'git --help'.`, 'error');
                    commandSuccess = false;
            }

            // Check for recent errors in terminal output
            const recentOutputs = this.getTerminalOutput().slice(-3);
            const hasRecentError = recentOutputs.some(output => 
                output.type === 'error' ||
                output.message.includes('fatal:') ||
                output.message.includes('error:') ||
                output.message.includes('not a git command')
            );

            // Only add node if command was successful AND no recent errors AND it's not a read-only command
            if (commandSuccess !== false && !hasRecentError && !this.isReadOnlyCommand(mainCommand, parts)) {
                const commandNode = this.timeline.addNode(mainCommand, {
                    ...commandData,
                    command: trimmedCommand,
                    timestamp: new Date().toISOString()
                });

                // Create edge based on command type
                if (mainCommand === 'switch' && commandData.targetNodeId) {
                    // For switch commands: edge from current HEAD to target branch node
                    if (this.timeline.head) {
                        this.timeline.addEdge(this.timeline.head, commandData.targetNodeId, trimmedCommand);
                    }
                    // Set HEAD to the switch node (not the target branch node)
                    this.timeline.setHead(commandNode.id);
                } else {
                    // For all other commands: edge from current HEAD to command node
                    if (this.timeline.head) {
                        this.timeline.addEdge(this.timeline.head, commandNode.id, trimmedCommand);
                    }
                    this.timeline.setHead(commandNode.id);
                }
                
                console.log('Added node for successful command:', mainCommand);
            } else if (hasRecentError) {
                console.log('Skipping node creation due to error in command output');
            }

        } catch (error) {
            console.error('Command processing error:', error);
            this.addTerminalOutput(`error: ${error.message}`, 'error');
        }

        this.saveTimeline();
        console.log('Command processing completed');
    }

    hasGitRepository() {
        // Check if there's an init node in the timeline
        const initNodes = Array.from(this.timeline.nodes.values()).filter(node => node.type === 'init');
        return initNodes.length > 0;
    }

    createGitRepository() {
        // Repository state is now determined by timeline, no need for separate localStorage
    }
    
    isReadOnlyCommand(mainCommand, parts) {
        // Commands that don't change repository state and shouldn't create nodes
        switch (mainCommand) {
            case 'branch':
                // git branch (no arguments) lists branches - read-only
                if (parts.length === 2) return true;
                // git branch <name> creates branch but doesn't move HEAD - no node/edge needed
                if (parts.length === 3 && !parts[2].startsWith('-')) return true;
                return false;
            case 'status':
            case 'log':
            case 'show':
            case 'diff':
            case 'help':
            case '--help':
                return true;
            // Remote commands DO create nodes and change state
            case 'remote':
                // git remote (no args) lists remotes - read-only
                if (parts.length === 2) return true;
                // git remote add/origin etc - creates nodes
                return false;
            default:
                return false;
        }
    }
    
    async handleInit(parts) {
        if (parts.length > 3) {
            this.addTerminalOutput('error: invalid arguments for git init', 'error');
            return;
        }

        if (this.hasGitRepository()) {
            this.addTerminalOutput('Reinitialized existing Git repository', 'info');
            return;
        }

        this.createGitRepository();

        // Create init node in timeline
        const initNode = this.timeline.addNode('init', {
            message: 'Initialized repository',
            branch: 'main'
        });
        
        this.timeline.setHead(initNode.id);
        this.timeline.branches.set('main', initNode.id);

        this.addTerminalOutput('Initialized empty Git repository', 'success');
    }

    async handleClone(parts) {
        if (parts.length !== 3) {
            this.addTerminalOutput('usage: git clone <repository>', 'error');
            return;
        }

        const repoUrl = parts[2];
        
        // Create clone node
        const cloneNode = this.timeline.addNode('clone', {
            repository: repoUrl,
            message: `Cloned from ${repoUrl}`,
            branch: 'main'
        });

        // Add remote
        this.timeline.addRemote('origin', repoUrl);

        if (this.timeline.head) {
            this.timeline.addEdge(this.timeline.head, cloneNode.id, `git clone ${repoUrl}`);
        }
        
        this.timeline.setHead(cloneNode.id);
        this.timeline.branches.set('main', cloneNode.id);
        this.createGitRepository();

        // Copy files from remote to local (simulate)
        this.addTerminalOutput(`Cloning from ${repoUrl}...`, 'info');
        this.addTerminalOutput('Repository cloned successfully', 'success');
    }

    async handleAdd(parts) {
        if (parts.length < 3) {
            this.addTerminalOutput('usage: git add <file>...', 'error');
            return false;
        }

        const target = parts[2];
        let filesToAdd = [];

        if (target === '.') {
            // Add all files from local directory to staging
            filesToAdd = [...this.sessionData.localFiles];
        } else if (target.includes('*')) {
            // Handle pattern matching (e.g., *.py, *.js, *.tsx, *.md)
            const extension = target.replace('*.', '');
            const matchingFiles = this.sessionData.localFiles.filter(file => file.endsWith(`.${extension}`));
            
            if (matchingFiles.length === 0) {
                this.addTerminalOutput(`No files found matching pattern: ${target}`, 'info');
                this.addTerminalOutput(`Available .${extension} files: ${this.sessionData.localFiles.filter(f => f.includes('.')).join(', ')}`, 'info');
                return false;
            } else {
                filesToAdd = matchingFiles;
                this.addTerminalOutput(`Found ${matchingFiles.length} .${extension} file(s)`, 'info');
            }
        } else {
            // Add specific file
            if (!this.sessionData.localFiles.includes(target)) {
                this.addTerminalOutput(`error: pathspec '${target}' did not match any files`, 'error');
                this.addTerminalOutput(`Available files: ${this.sessionData.localFiles.join(', ')}`, 'info');
                return false;
            }
            filesToAdd = [target];
        }

        // Add files to staging area (copy, don't move)
        filesToAdd.forEach(file => {
            if (!this.sessionData.stagedFiles.includes(file)) {
                this.sessionData.stagedFiles.push(file);
            }
        });
        
        // Update session data with last used filename
        if (filesToAdd.length > 0 && !target.includes('*') && target !== '.') {
            this.updateSessionData('lastFileName', filesToAdd[0]);
        }

        this.addTerminalOutput(`Added ${filesToAdd.length} file(s) to staging area`, 'success');
        return true;
    }

    async handleCommit(parts) {
        console.log('handleCommit called with parts:', parts);
        console.log('Staged files:', this.sessionData.stagedFiles);
        
        // Check if stage directory has files
        if (this.sessionData.stagedFiles.length === 0) {
            console.log('No staged files found');
            this.addTerminalOutput('nothing to commit, working tree clean', 'info');
            return false;
        }

        // Parse commit message
        let message = 'Commit';
        const messageIndex = parts.findIndex(part => part === '-m');
        
        console.log('messageIndex:', messageIndex);
        
        if (messageIndex !== -1 && parts[messageIndex + 1]) {
            message = parts[messageIndex + 1].replace(/['"]/g, '');
            // Update session data with last commit message
            this.updateSessionData('lastCommitMessage', message);
            console.log('Commit message:', message);
        } else {
            console.log('No commit message found');
            this.addTerminalOutput('error: commit message required with -m', 'error');
            return false;
        }

        // Get files from staging area
        const filesToCommit = [...this.sessionData.stagedFiles];
        console.log('Files to commit:', filesToCommit);

        // Create realistic commit hash
        const commitHash = this.timeline.generateCommitHash();

        // Move files from staging to committed files and clear staging
        this.sessionData.committedFiles.push(...filesToCommit);
        this.sessionData.stagedFiles = [];
        
        console.log('Commit created, HEAD set to:', commitHash);

        this.addTerminalOutput(`[${this.timeline.getCurrentBranch() || 'main'} ${this.timeline.getShortHash(commitHash)}] ${message}`, 'success');
        this.addTerminalOutput(` ${filesToCommit.length} file${filesToCommit.length > 1 ? 's' : ''} changed`, 'info');
        
        return {
            hash: commitHash,
            shortHash: this.timeline.getShortHash(commitHash),
            message: message,
            files: filesToCommit,
            author: this.timeline.getConfig('user.name') || 'Unknown'
        };
    }

    async handleBranch(parts) {
        if (parts.length === 2) {
            // List branches
            const branches = Array.from(this.timeline.branches.keys());
            const currentBranch = this.timeline.getCurrentBranch();
            
            branches.forEach(branch => {
                const marker = branch === currentBranch ? '* ' : '  ';
                this.addTerminalOutput(`${marker}${branch}`, 'info');
            });
            return true; // Success, but read-only (no node creation)
        } else if (parts[2] === '-d' && parts[3]) {
            // Delete branch
            const branchName = parts[3];
            try {
                this.timeline.deleteBranch(branchName);
                this.addTerminalOutput(`Deleted branch ${branchName}`, 'success');
                return true;
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
                return false;
            }
        } else if (parts[2] === '-m' && parts[3] && parts[4]) {
            // Rename branch
            const oldName = parts[3];
            const newName = parts[4];
            try {
                this.timeline.renameBranch(oldName, newName);
                this.addTerminalOutput(`Renamed branch ${oldName} to ${newName}`, 'success');
                return true;
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
                return false;
            }
        } else if (parts[2] && !parts[2].startsWith('-')) {
            // Create new branch - this should NOT create a command node
            const branchName = parts[2];
            try {
                const branchNode = this.timeline.createBranch(branchName);
                // Update session data with last branch name
                this.updateSessionData('lastBranchName', branchName);
                this.addTerminalOutput(`Created branch ${branchName}`, 'success');
                // IMPORTANT: Return false to prevent command node creation in main processor
                return false;
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
                return false;
            }
        } else {
            this.addTerminalOutput('usage: git branch [-d] [-m old new] [branch-name]', 'error');
            return false;
        }
    }

    async handleSwitch(parts) {
        if (parts.length < 3) {
            this.addTerminalOutput('usage: git switch <branch-name>', 'error');
            return null; // Return null to indicate no target node
        }

        const target = parts[2];
        let targetNodeId = null;

        if (target === '-c' && parts[3]) {
            // Create and switch to new branch
            const branchName = parts[3];
            try {
                const branchNode = this.timeline.createBranch(branchName);
                targetNodeId = this.timeline.switchToBranch(branchName);
                this.addTerminalOutput(`Switched to new branch ${branchName}`, 'success');
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
                return null;
            }
        } else if (target === '~') {
            // Switch to previous branch
            if (this.timeline.previousBranch) {
                const prevBranch = this.timeline.previousBranch;
                targetNodeId = this.timeline.switchToBranch(prevBranch);
                this.addTerminalOutput(`Switched to branch ${prevBranch}`, 'success');
            } else {
                this.addTerminalOutput('error: no previous branch', 'error');
                return null;
            }
        } else {
            // Switch to existing branch
            try {
                targetNodeId = this.timeline.switchToBranch(target);
                this.addTerminalOutput(`Switched to branch ${target}`, 'success');
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
                return null;
            }
        }
        
        return targetNodeId; // Return the target node ID for edge creation
    }

    async handleMerge(parts) {
        if (parts.length < 3) {
            this.addTerminalOutput('usage: git merge <branch-name>', 'error');
            return;
        }

        if (parts[2] === '--abort') {
            // TODO: Implement merge abort
            this.addTerminalOutput('Merge abort not yet implemented', 'warning');
            return;
        }

        const branchName = parts[2];
        const currentBranch = this.timeline.getCurrentBranch();

        if (currentBranch === branchName) {
            this.addTerminalOutput('error: cannot merge branch with itself', 'error');
            return;
        }

        if (!this.timeline.branches.has(branchName)) {
            this.addTerminalOutput(`error: branch '${branchName}' not found`, 'error');
            return;
        }

        // Create merge edge
        const fromNodeId = this.timeline.getBranchHead(branchName);
        const toNodeId = this.timeline.head;

        const mergeEdge = this.timeline.addEdge(fromNodeId, toNodeId, `git merge ${branchName}`, {
            isMerge: true
        });
        mergeEdge.isBold = true;

        this.addTerminalOutput(`Merged branch ${branchName} into ${currentBranch}`, 'success');
    }

    async handleRemote(parts) {
        if (parts.length === 2) {
            // List remotes with -v
            this.addTerminalOutput('usage: git remote -v', 'info');
            return;
        }

        if (parts[2] === '-v') {
            // List remotes verbose
            const remotes = Array.from(this.timeline.remotes.entries());
            if (remotes.length === 0) {
                this.addTerminalOutput('No remotes configured', 'info');
            } else {
                remotes.forEach(([name, config]) => {
                    this.addTerminalOutput(`${name}\t${config.url} (fetch)`, 'info');
                    this.addTerminalOutput(`${name}\t${config.url} (push)`, 'info');
                });
            }
        } else if (parts[2] === 'add' && parts[3] && parts[4]) {
            // Add remote
            const name = parts[3];
            const url = parts[4];
            
            if (this.timeline.getRemote(name)) {
                this.addTerminalOutput(`error: remote ${name} already exists`, 'error');
                return;
            }

            this.timeline.addRemote(name, url);
            // Update session data with last remote URL
            this.updateSessionData('lastRemoteUrl', url);
            this.addTerminalOutput(`Added remote ${name}`, 'success');
        } else if (parts[2] === 'remove' && parts[3]) {
            // Remove remote
            const name = parts[3];
            
            if (!this.timeline.getRemote(name)) {
                this.addTerminalOutput(`error: remote ${name} not found`, 'error');
                return;
            }

            this.timeline.removeRemote(name);
            this.addTerminalOutput(`Removed remote ${name}`, 'success');
        } else if (parts[2] === 'set-url' && parts[3] && parts[4]) {
            // Set remote URL
            const name = parts[3];
            const url = parts[4];
            
            if (!this.timeline.getRemote(name)) {
                this.addTerminalOutput(`error: remote ${name} not found`, 'error');
                return;
            }

            this.timeline.remotes.set(name, { url, last_sync_node: null });
            this.addTerminalOutput(`Updated remote ${name} URL`, 'success');
        } else {
            this.addTerminalOutput('usage: git remote [-v] [add <name> <url>] [remove <name>] [set-url <name> <url>]', 'error');
        }
    }

    async handlePull(parts) {
        const origin = this.timeline.getRemote('origin');
        
        if (!origin) {
            this.addTerminalOutput('error: no remote origin configured', 'error');
            return;
        }

        // Create pull node with bold incoming edge
        const pullNode = this.timeline.addNode('pull', {
            repository: origin.url,
            message: `Pulled from ${origin.url}`,
            branch: this.timeline.getCurrentBranch() || 'main'
        });

        if (this.timeline.head) {
            const pullEdge = this.timeline.addEdge(pullNode.id, this.timeline.head, `git pull`);
            pullEdge.isBold = true;
        }
        
        this.timeline.setHead(pullNode.id);

        // Copy files from remote to local (simulate)
        this.addTerminalOutput('Pulling from origin...', 'info');
        this.addTerminalOutput('Files pulled successfully', 'success');
    }

    async handlePush(parts) {
        const origin = this.timeline.getRemote('origin');
        
        if (!origin) {
            this.addTerminalOutput('error: no remote origin configured', 'error');
            return;
        }

        // Create push node with bold outgoing edge
        const pushNode = this.timeline.addNode('push', {
            repository: origin.url,
            message: `Pushed to ${origin.url}`,
            branch: this.timeline.getCurrentBranch() || 'main'
        });

        if (this.timeline.head) {
            const pushEdge = this.timeline.addEdge(this.timeline.head, pushNode.id, `git push origin main`);
            pushEdge.isBold = true;
        }
        
        this.timeline.setHead(pushNode.id);

        // Copy files from commit to remote (simulate)
        this.addTerminalOutput('Pushing to origin...', 'info');
        this.addTerminalOutput('Files pushed successfully', 'success');
    }

    async handleConfig(parts) {
        console.log('handleConfig called with parts:', parts);
        
        if (parts.includes('--global') && parts.includes('user.name')) {
            const nameIndex = parts.findIndex(part => part === 'user.name');
            console.log('nameIndex:', nameIndex);
            
            if (nameIndex !== -1 && parts[nameIndex + 1]) {
                const name = parts[nameIndex + 1];
                console.log('Setting user name to:', name);
                
                this.timeline.setConfig('user.name', name);
                // Update session data with last user name
                this.updateSessionData('lastUserName', name);
                this.addTerminalOutput(`Set user name to ${name}`, 'success');
            } else {
                console.log('No name found after user.name');
                this.addTerminalOutput('usage: git config --global user.name "<name>"', 'info');
            }
        } else if (parts.includes('--global') && parts.includes('user.email')) {
            const emailIndex = parts.findIndex(part => part === 'user.email');
            console.log('emailIndex:', emailIndex);
            
            if (emailIndex !== -1 && parts[emailIndex + 1]) {
                const email = parts[emailIndex + 1];
                console.log('Setting user email to:', email);
                
                this.timeline.setConfig('user.email', email);
                // Update session data with last user email
                this.updateSessionData('lastUserEmail', email);
                this.addTerminalOutput(`Set user email to ${email}`, 'success');
            } else {
                console.log('No email found after user.email');
                this.addTerminalOutput('usage: git config --global user.email "<email>"', 'info');
            }
        } else {
            console.log('Config command not recognized');
            this.addTerminalOutput('usage: git config --global user.name "<name>"', 'info');
            this.addTerminalOutput('   or: git config --global user.email "<email>"', 'info');
        }
    }

    async handleLog(parts) {
        const commits = this.timeline.getCommits();
        
        if (commits.length === 0) {
            this.addTerminalOutput('No commits yet', 'info');
            return;
        }

        if (parts.includes('--oneline')) {
            commits.forEach(commit => {
                const shortHash = commit.data.shortHash || commit.id.slice(-7);
                this.addTerminalOutput(`${shortHash} ${commit.data.message}`, 'info');
            });
        } else if (parts.includes('-n') && parts[parts.indexOf('-n') + 1]) {
            const limit = parseInt(parts[parts.indexOf('-n') + 1]);
            const limitedCommits = commits.slice(0, limit);
            limitedCommits.forEach(commit => {
                const shortHash = commit.data.shortHash || commit.id.slice(-7);
                const fullHash = commit.data.hash || commit.id;
                this.addTerminalOutput(`commit ${fullHash}`, 'info');
                this.addTerminalOutput(`Author: ${commit.data.author}`, 'info');
                this.addTerminalOutput(`Date: ${new Date(commit.timestamp).toLocaleString()}`, 'info');
                this.addTerminalOutput(`\n    ${commit.data.message}\n`, 'info');
            });
        } else {
            commits.forEach(commit => {
                const shortHash = commit.data.shortHash || commit.id.slice(-7);
                const fullHash = commit.data.hash || commit.id;
                this.addTerminalOutput(`commit ${fullHash}`, 'info');
                this.addTerminalOutput(`Author: ${commit.data.author}`, 'info');
                this.addTerminalOutput(`Date: ${new Date(commit.timestamp).toLocaleString()}`, 'info');
                this.addTerminalOutput(`\n    ${commit.data.message}\n`, 'info');
            });
        }
    }

    async handleReset(parts) {
        if (parts.includes('--soft') && parts.includes('HEAD~1')) {
            // Soft reset - move files from commit to stage
            this.addTerminalOutput('Soft reset completed - files moved to staging area', 'success');
        } else if (parts.includes('HEAD~1')) {
            // Hard reset - remove last commit and files
            // Remove last node from timeline
            const commits = this.timeline.getCommits();
            if (commits.length > 0) {
                const lastCommit = commits[0];
                this.timeline.nodes.delete(lastCommit.id);
                
                // Find previous head
                const edges = Array.from(this.timeline.edges.values());
                const incomingEdge = edges.find(edge => edge.to === lastCommit.id);
                if (incomingEdge) {
                    this.timeline.setHead(incomingEdge.from);
                    this.timeline.edges.delete(incomingEdge.id);
                }
            }
            
            this.addTerminalOutput('Hard reset completed - last commit removed', 'success');
        } else {
            this.addTerminalOutput('usage: git reset [--soft] HEAD~1', 'error');
        }
    }

    addTerminalOutput(message, type = 'info') {
        this.terminalOutput.push({ message, type, timestamp: new Date() });
    }

    getTerminalOutput() {
        return this.terminalOutput;
    }

    clearTerminalOutput() {
        this.terminalOutput = [];
    }

    saveTimeline() {
        try {
            const timelineData = this.timeline.getTimelineData();
            localStorage.setItem(this.storageKey, JSON.stringify(timelineData));
        } catch (error) {
            console.error('Failed to save timeline:', error);
        }
    }

    loadTimeline() {
        try {
            const savedData = localStorage.getItem(this.storageKey);
            if (savedData) {
                const data = JSON.parse(savedData);
                
                // Reconstruct timeline from saved data
                this.timeline = new GitTimeline();
                data.nodes.forEach(node => this.timeline.nodes.set(node.id, node));
                data.edges.forEach(edge => this.timeline.edges.set(edge.id, edge));
                this.timeline.head = data.head;
                this.timeline.branches = new Map(Object.entries(data.branches));
                this.timeline.remotes = new Map(Object.entries(data.remotes));
                this.timeline.config = data.config;
                this.timeline.nodeCounter = Math.max(...data.nodes.map(n => parseInt(n.id.split('_')[1]) || 0));
            }
        } catch (error) {
            console.error('Failed to load timeline:', error);
        }
    }
}

// Make class available globally
window.GitCommandProcessor = GitCommandProcessor;
