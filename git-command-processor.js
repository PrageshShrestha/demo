const GitFileSystem = require('./git-filesystem');

class GitCommandProcessor {
    constructor() {
        this.terminalOutput = [];
        this.gitFS = new GitFileSystem();
        this.timeline = this.gitFS.timeline;
        this.lastLogData = null;
        this.isRepositoryInitialized = false; // Track initialization state
    }

    async processCommand(command) {
        const trimmedCommand = command.trim();
        if (!trimmedCommand) return;

        this.addTerminalOutput(`$ ${trimmedCommand}`, 'command');

        try {
            // Check if .git directory exists (except for git init and git clone)
            if (!trimmedCommand.startsWith('git init') && !trimmedCommand.startsWith('git clone')) {
                const gitDir = await this.gitFS.getGitDirectory();
                if (!gitDir) {
                    this.addTerminalOutput('fatal: not a git repository (or any of the parent directories): .git', 'error');
                    return;
                }
            }

            const parts = trimmedCommand.split(' ');
            const mainCommand = parts[1];

            switch (mainCommand) {
                case 'init':
                    await this.handleInit(parts);
                    break;
                case 'clone':
                    await this.handleClone(parts);
                    break;
                case 'add':
                    await this.handleAdd(parts);
                    break;
                case 'commit':
                    await this.handleCommit(parts);
                    break;
                case 'branch':
                    await this.handleBranch(parts);
                    break;
                case 'switch':
                    await this.handleSwitch(parts);
                    break;
                case 'merge':
                    await this.handleMerge(parts);
                    break;
                case 'remote':
                    await this.handleRemote(parts);
                    break;
                case 'pull':
                    await this.handlePull(parts);
                    break;
                case 'push':
                    await this.handlePush(parts);
                    break;
                case 'config':
                    await this.handleConfig(parts);
                    break;
                case 'log':
                    await this.handleLog(parts);
                    break;
                case 'reset':
                    await this.handleReset(parts);
                    break;
                case 'detach':
                    await this.handleDetach(parts);
                    break;
                default:
                    this.addTerminalOutput(`git: '${mainCommand}' is not a git command. See 'git --help'.`, 'error');
            }
        } catch (error) {
            this.addTerminalOutput(`error: ${error.message}`, 'error');
        }

        await this.gitFS.saveTimeline();
    }

    async handleInit(parts) {
        if (parts.length > 3) {
            this.addTerminalOutput('error: invalid arguments for git init', 'error');
            return;
        }

        if (this.isRepositoryInitialized) {
            this.addTerminalOutput('Reinitialized existing Git repository', 'info');
            // Set timeline log data for reinitialization
            this.lastLogData = {
                type: 'info',
                description: 'Repository reinitialized',
                details: 'Git repository already existed - reinitialized in same directory'
            };
            return;
        }

        await this.gitFS.createGitDirectory();
        await this.gitFS.ensureDirectories();
        
        // Mark as initialized
        this.isRepositoryInitialized = true;

        // Create init node in timeline
        const initNode = this.gitFS.timeline.addNode('init', {
            message: 'Initialized repository',
            branch: 'main'
        });
        
        this.gitFS.timeline.setHead(initNode.id);
        this.gitFS.timeline.branches.set('main', initNode.id);

        this.addTerminalOutput('Initialized empty Git repository', 'success');
    }

    async handleClone(parts) {
        if (parts.length !== 3) {
            this.addTerminalOutput('usage: git clone <repository>', 'error');
            return;
        }

        const repoUrl = parts[2];
        
        // Create clone node
        const cloneNode = this.gitFS.timeline.addNode('clone', {
            repository: repoUrl,
            message: `Cloned from ${repoUrl}`,
            branch: 'main'
        });

        // Add remote
        this.gitFS.timeline.addRemote('origin', repoUrl);

        if (this.gitFS.timeline.head) {
            this.gitFS.timeline.addEdge(this.gitFS.timeline.head, cloneNode.id, `git clone ${repoUrl}`);
        }
        
        this.gitFS.timeline.setHead(cloneNode.id);
        this.gitFS.timeline.branches.set('main', cloneNode.id);

        // Copy files from remote to local (simulate)
        this.addTerminalOutput(`Cloning from ${repoUrl}...`, 'info');
        this.addTerminalOutput('Repository cloned successfully', 'success');
    }

    async handleAdd(parts) {
        if (parts.length < 3) {
            this.addTerminalOutput('usage: git add <file>...', 'error');
            return;
        }

        const target = parts[2];
        let filesToAdd = [];

        if (target === '.') {
            // Add all files from local directory
            filesToAdd = await this.gitFS.listFiles(this.gitFS.localDir);
            await this.gitFS.copyFiles(this.gitFS.localDir, this.gitFS.stageDir);
        } else if (target.includes('*')) {
            // Handle pattern matching (e.g., *.py)
            const extension = target.replace('*.', '');
            const allFiles = await this.gitFS.listFiles(this.gitFS.localDir);
            filesToAdd = allFiles.filter(file => file.endsWith(`.${extension}`));
            await this.gitFS.copyFiles(this.gitFS.localDir, this.gitFS.stageDir, filesToAdd);
        } else {
            // Add specific file
            const filePath = path.join(this.gitFS.localDir, target);
            if (await this.gitFS.fileExists(filePath)) {
                filesToAdd = [target];
                await this.gitFS.copyFiles(this.gitFS.localDir, this.gitFS.stageDir, filesToAdd);
            } else {
                this.addTerminalOutput(`fatal: pathspec '${target}' did not match any files`, 'error');
                return;
            }
        }

        // Create add node in timeline
        const addNode = this.gitFS.timeline.addNode('add', {
            files: filesToAdd,
            message: `Added ${filesToAdd.length} file(s)`,
            branch: this.gitFS.timeline.getCurrentBranch() || 'main'
        });

        if (this.gitFS.timeline.head) {
            this.gitFS.timeline.addEdge(this.gitFS.timeline.head, addNode.id, `git add ${target}`);
        }
        
        this.gitFS.timeline.setHead(addNode.id);

        this.addTerminalOutput(`Added ${filesToAdd.length} file(s) to staging area`, 'success');
    }

    async handleCommit(parts) {
        // Check if stage directory has files
        const isStageEmpty = await this.gitFS.isDirectoryEmpty(this.gitFS.stageDir);
        
        if (isStageEmpty) {
            this.addTerminalOutput('nothing to commit, working tree clean', 'info');
            return;
        }

        // Parse commit message
        let message = 'Commit';
        const messageIndex = parts.findIndex(part => part === '-m');
        
        if (messageIndex !== -1 && parts[messageIndex + 1]) {
            message = parts[messageIndex + 1].replace(/['"]/g, '');
        } else {
            this.addTerminalOutput('error: commit message required with -m', 'error');
            return;
        }

        // Move files from stage to commit
        await this.gitFS.moveFiles(this.gitFS.stageDir, this.gitFS.commitDir);

        // Create commit node
        const commitNode = this.gitFS.timeline.addNode('commit', {
            message: message,
            branch: this.gitFS.timeline.getCurrentBranch() || 'main',
            author: this.gitFS.timeline.getConfig('user.name') || 'Unknown'
        });

        if (this.gitFS.timeline.head) {
            this.gitFS.timeline.addEdge(this.gitFS.timeline.head, commitNode.id, `git commit -m "${message}"`);
        }
        
        this.gitFS.timeline.setHead(commitNode.id);

        this.addTerminalOutput(`[${this.gitFS.timeline.getCurrentBranch() || 'main'} ${commitNode.id}] ${message}`, 'success');
    }

    async handleBranch(parts) {
        if (parts.length === 2) {
            // List branches
            const branches = Array.from(this.gitFS.timeline.branches.keys());
            const currentBranch = this.gitFS.timeline.getCurrentBranch();
            
            branches.forEach(branch => {
                const marker = branch === currentBranch ? '* ' : '  ';
                this.addTerminalOutput(`${marker}${branch}`, 'info');
            });
        } else if (parts[2] === '-d' && parts[3]) {
            // Delete branch
            const branchName = parts[3];
            try {
                this.gitFS.timeline.deleteBranch(branchName);
                this.addTerminalOutput(`Deleted branch ${branchName}`, 'success');
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
            }
        } else if (parts[2] === '-m' && parts[3] && parts[4]) {
            // Rename branch
            const oldName = parts[3];
            const newName = parts[4];
            try {
                this.gitFS.timeline.renameBranch(oldName, newName);
                this.addTerminalOutput(`Renamed branch ${oldName} to ${newName}`, 'success');
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
            }
        } else if (parts[2] && !parts[2].startsWith('-')) {
            // Create new branch
            const branchName = parts[2];
            try {
                const branchNode = this.gitFS.timeline.createBranch(branchName);
                this.addTerminalOutput(`Created branch ${branchName}`, 'success');
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
            }
        } else {
            this.addTerminalOutput('usage: git branch [-d] [-m old new] [branch-name]', 'error');
        }
    }

    async handleSwitch(parts) {
        if (parts.length < 3) {
            this.addTerminalOutput('usage: git switch <branch-name>', 'error');
            return;
        }

        const target = parts[2];

        // Clear detached HEAD state when switching to a branch
        if (this.gitFS.timeline.isDetachedHEAD()) {
            this.gitFS.timeline.clearDetachedHEAD();
            this.addTerminalOutput('Exiting detached HEAD state', 'info');
        }

        if (target === '-c' && parts[3]) {
            // Create and switch to new branch
            const branchName = parts[3];
            try {
                const branchNode = this.gitFS.timeline.createBranch(branchName);
                this.gitFS.timeline.switchToBranch(branchName);
                this.addTerminalOutput(`Switched to new branch ${branchName}`, 'success');
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
            }
        } else if (target === '~') {
            // Switch to previous branch
            if (this.gitFS.timeline.previousBranch) {
                const prevBranch = this.gitFS.timeline.previousBranch;
                this.gitFS.timeline.switchToBranch(prevBranch);
                this.addTerminalOutput(`Switched to branch ${prevBranch}`, 'success');
            } else {
                this.addTerminalOutput('error: no previous branch', 'error');
            }
        } else {
            // Switch to existing branch
            try {
                this.gitFS.timeline.switchToBranch(target);
                this.addTerminalOutput(`Switched to branch ${target}`, 'success');
            } catch (error) {
                this.addTerminalOutput(`error: ${error.message}`, 'error');
            }
        }
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
        const currentBranch = this.gitFS.timeline.getCurrentBranch();

        if (currentBranch === branchName) {
            this.addTerminalOutput('error: cannot merge branch with itself', 'error');
            return;
        }

        if (!this.gitFS.timeline.branches.has(branchName)) {
            this.addTerminalOutput(`error: branch '${branchName}' not found`, 'error');
            return;
        }

        // Create merge edge
        const fromNodeId = this.gitFS.timeline.getBranchHead(branchName);
        const toNodeId = this.gitFS.timeline.head;

        const mergeEdge = this.gitFS.timeline.addEdge(fromNodeId, toNodeId, `git merge ${branchName}`, {
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
            const remotes = Array.from(this.gitFS.timeline.remotes.entries());
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
            
            if (this.gitFS.timeline.getRemote(name)) {
                this.addTerminalOutput(`error: remote ${name} already exists`, 'error');
                return;
            }

            this.gitFS.timeline.addRemote(name, url);
            this.addTerminalOutput(`Added remote ${name}`, 'success');
        } else if (parts[2] === 'remove' && parts[3]) {
            // Remove remote
            const name = parts[3];
            
            if (!this.gitFS.timeline.getRemote(name)) {
                this.addTerminalOutput(`error: remote ${name} not found`, 'error');
                return;
            }

            this.gitFS.timeline.removeRemote(name);
            this.addTerminalOutput(`Removed remote ${name}`, 'success');
        } else if (parts[2] === 'set-url' && parts[3] && parts[4]) {
            // Set remote URL
            const name = parts[3];
            const url = parts[4];
            
            if (!this.gitFS.timeline.getRemote(name)) {
                this.addTerminalOutput(`error: remote ${name} not found`, 'error');
                return;
            }

            this.gitFS.timeline.remotes.set(name, { url, last_sync_node: null });
            this.addTerminalOutput(`Updated remote ${name} URL`, 'success');
        } else {
            this.addTerminalOutput('usage: git remote [-v] [add <name> <url>] [remove <name>] [set-url <name> <url>]', 'error');
        }
    }

    async handlePull(parts) {
        const origin = this.gitFS.timeline.getRemote('origin');
        
        if (!origin) {
            this.addTerminalOutput('error: no remote origin configured', 'error');
            return;
        }

        // Create pull node with bold incoming edge
        const pullNode = this.gitFS.timeline.addNode('pull', {
            repository: origin.url,
            message: `Pulled from ${origin.url}`,
            branch: this.gitFS.timeline.getCurrentBranch() || 'main'
        });

        if (this.gitFS.timeline.head) {
            const pullEdge = this.gitFS.timeline.addEdge(pullNode.id, this.gitFS.timeline.head, `git pull`);
            pullEdge.isBold = true;
        }
        
        this.gitFS.timeline.setHead(pullNode.id);

        // Copy files from remote to local (simulate)
        this.addTerminalOutput('Pulling from origin...', 'info');
        this.addTerminalOutput('Files pulled successfully', 'success');
    }

    async handlePush(parts) {
        const origin = this.gitFS.timeline.getRemote('origin');
        
        if (!origin) {
            this.addTerminalOutput('error: no remote origin configured', 'error');
            return;
        }

        // Create push node with bold outgoing edge
        const pushNode = this.gitFS.timeline.addNode('push', {
            repository: origin.url,
            message: `Pushed to ${origin.url}`,
            branch: this.gitFS.timeline.getCurrentBranch() || 'main'
        });

        if (this.gitFS.timeline.head) {
            const pushEdge = this.gitFS.timeline.addEdge(this.gitFS.timeline.head, pushNode.id, `git push origin main`);
            pushEdge.isBold = true;
        }
        
        this.gitFS.timeline.setHead(pushNode.id);

        // Copy files from commit to remote (simulate)
        this.addTerminalOutput('Pushing to origin...', 'info');
        this.addTerminalOutput('Files pushed successfully', 'success');
    }

    async handleConfig(parts) {
        if (parts.includes('--global') && parts.includes('user.name')) {
            const nameIndex = parts.findIndex(part => part === 'user.name');
            if (nameIndex !== -1 && parts[nameIndex + 1]) {
                const name = parts[nameIndex + 1];
                this.gitFS.timeline.setConfig('user.name', name);
                this.addTerminalOutput(`Set user name to ${name}`, 'success');
            }
        } else if (parts.includes('--global') && parts.includes('user.email')) {
            const emailIndex = parts.findIndex(part => part === 'user.email');
            if (emailIndex !== -1 && parts[emailIndex + 1]) {
                const email = parts[emailIndex + 1];
                this.gitFS.timeline.setConfig('user.email', email);
                this.addTerminalOutput(`Set user email to ${email}`, 'success');
            }
        } else {
            this.addTerminalOutput('usage: git config --global user.name "<name>"', 'info');
            this.addTerminalOutput('   or: git config --global user.email "<email>"', 'info');
        }
    }

    async handleLog(parts) {
        const commits = this.gitFS.timeline.getCommits();
        
        if (commits.length === 0) {
            this.addTerminalOutput('No commits yet', 'info');
            return;
        }

        if (parts.includes('--oneline')) {
            commits.forEach(commit => {
                this.addTerminalOutput(`${commit.id} ${commit.data.message}`, 'info');
            });
        } else if (parts.includes('-n') && parts[parts.indexOf('-n') + 1]) {
            const limit = parseInt(parts[parts.indexOf('-n') + 1]);
            const limitedCommits = commits.slice(0, limit);
            limitedCommits.forEach(commit => {
                this.addTerminalOutput(`commit ${commit.id}`, 'info');
                this.addTerminalOutput(`Author: ${commit.data.author}`, 'info');
                this.addTerminalOutput(`Date: ${new Date(commit.timestamp).toLocaleString()}`, 'info');
                this.addTerminalOutput(`\n    ${commit.data.message}\n`, 'info');
            });
        } else {
            commits.forEach(commit => {
                this.addTerminalOutput(`commit ${commit.id}`, 'info');
                this.addTerminalOutput(`Author: ${commit.data.author}`, 'info');
                this.addTerminalOutput(`Date: ${new Date(commit.timestamp).toLocaleString()}`, 'info');
                this.addTerminalOutput(`\n    ${commit.data.message}\n`, 'info');
            });
        }
    }

    async handleReset(parts) {
        if (parts.includes('--soft') && parts.includes('HEAD~1')) {
            // Soft reset - move files from commit to stage
            await this.gitFS.moveFiles(this.gitFS.commitDir, this.gitFS.stageDir);
            this.addTerminalOutput('Soft reset completed - files moved to staging area', 'success');
        } else if (parts.includes('HEAD~1')) {
            // Hard reset - remove last commit and files
            await this.gitFS.deleteDirectory(this.gitFS.commitDir);
            await this.gitFS.ensureDirectories();
            
            // Remove last node from timeline
            const commits = this.gitFS.timeline.getCommits();
            if (commits.length > 0) {
                const lastCommit = commits[0];
                this.gitFS.timeline.nodes.delete(lastCommit.id);
                
                // Find previous head
                const edges = Array.from(this.gitFS.timeline.edges.values());
                const incomingEdge = edges.find(edge => edge.to === lastCommit.id);
                if (incomingEdge) {
                    this.gitFS.timeline.setHead(incomingEdge.from);
                    this.gitFS.timeline.edges.delete(incomingEdge.id);
                }
            }
            
            this.addTerminalOutput('Hard reset completed - last commit removed', 'success');
        } else {
            this.addTerminalOutput('usage: git reset [--soft] HEAD~1', 'error');
        }
    }

    async handleDetach(parts) {
        if (parts.length > 2) {
            this.addTerminalOutput('usage: git detach', 'error');
            return;
        }

        // Check if we have any commits
        const currentBranch = this.gitFS.timeline.getCurrentBranch();
        const commits = Array.from(this.gitFS.timeline.nodes.values())
            .filter(node => node.type === 'commit');
        
        if (commits.length === 0) {
            this.addTerminalOutput('error: no commits to detach to', 'error');
            return;
        }

        // Get the current commit
        const currentCommit = commits[commits.length - 1];
        
        // Set detached HEAD state using timeline method
        this.gitFS.timeline.setDetachedHEAD(currentCommit.id);
        
        this.addTerminalOutput(`HEAD is now at ${currentCommit.id.substring(0, 7)} ${currentCommit.message}`, 'success');
        this.addTerminalOutput('⚠️  You are in detached HEAD state', 'warning');
        this.addTerminalOutput('  Commits made in this state will be lost unless you create a branch', 'info');
        this.addTerminalOutput('  Use "git switch -c <branch-name>" to create a new branch', 'info');
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
}

module.exports = GitCommandProcessor;
