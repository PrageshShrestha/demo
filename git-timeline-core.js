// git-timeline-core.js
class GitTimelineCore {
    constructor(projectName = 'project_👍') {
        this.projectName = projectName;
        this.currentState = {
            isInitialized: false,
            currentBranch: 'master',
            branches: {
                master: {
                    name: 'master',
                    commits: [],
                    head: null
                }
            },
            commits: [],
            workingDirectory: [
                { name: 'main.py', type: 'python', staged: false, committed: false, content: '# Python main file' },
                { name: 'utils.py', type: 'python', staged: false, committed: false, content: '# Utility functions' },
                { name: 'requirements.txt', type: 'requirements', staged: false, committed: false, content: 'requests>=2.25.1' },
                { name: 'config.py', type: 'config', staged: false, committed: false, content: 'DEBUG = True' },
                { name: 'tests/test_main.py', type: 'test', staged: false, committed: false, content: 'import unittest' }
            ],
            stagingArea: [],
            remotes: {},
            tags: [],
            mergeInProgress: false,
            rebaseInProgress: false,
            detachedHEAD: false
        };
        
        this.commitCounter = 0;
        this.branchCounter = 1;
        this.commandHistory = [];
    }

    // Command execution
    executeCommand(command) {
        this.commandHistory.push({
            command,
            timestamp: new Date(),
            stateBefore: JSON.parse(JSON.stringify(this.currentState))
        });

        const parts = command.split(' ');
        if (parts[0] !== 'git') {
            return { success: false, output: `Command must start with 'git'` };
        }

        const gitCommand = parts[1];
        const args = parts.slice(2);

        switch(gitCommand) {
            case 'init':
                return this.handleInit(args);
            case 'add':
                return this.handleAdd(args);
            case 'commit':
                return this.handleCommit(args);
            case 'branch':
                return this.handleBranch(args);
            case 'checkout':
            case 'switch':
                return this.handleSwitch(args);
            case 'merge':
                return this.handleMerge(args);
            case 'status':
                return this.handleStatus(args);
            case 'log':
                return this.handleLog(args);
            case 'remote':
                return this.handleRemote(args);
            case 'push':
                return this.handlePush(args);
            case 'pull':
                return this.handlePull(args);
            case 'clone':
                return this.handleClone(args);
            case 'reset':
                return this.handleReset(args);
            default:
                return { success: false, output: `Unknown command: ${gitCommand}` };
        }
    }

    handleInit(args) {
        if (this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'Reinitialized existing Git repository' 
            };
        }

        this.currentState.isInitialized = true;
        this.currentState.currentBranch = 'main';
        this.currentState.branches.main = {
            name: 'main',
            commits: [],
            head: null
        };

        return { 
            success: true, 
            output: `Initialized empty Git repository in ${this.projectName}/.git/`,
            stateChange: true
        };
    }

    handleAdd(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository (or any parent directories)' 
            };
        }

        if (args.length === 0) {
            return { success: false, output: 'Nothing specified, nothing added.' };
        }

        const addedFiles = [];
        args.forEach(arg => {
            if (arg === '.') {
                // Add all files
                this.currentState.workingDirectory.forEach(file => {
                    if (!file.staged) {
                        file.staged = true;
                        if (!this.currentState.stagingArea.includes(file.name)) {
                            this.currentState.stagingArea.push(file.name);
                        }
                        addedFiles.push(file.name);
                    }
                });
            } else if (arg.endsWith('.py')) {
                // Add specific Python file
                const file = this.currentState.workingDirectory.find(f => f.name === arg);
                if (file && !file.staged) {
                    file.staged = true;
                    this.currentState.stagingArea.push(file.name);
                    addedFiles.push(file.name);
                }
            }
        });

        return { 
            success: true, 
            output: addedFiles.length > 0 
                ? `Added ${addedFiles.length} file(s) to staging area` 
                : 'No files added',
            stateChange: addedFiles.length > 0
        };
    }

    handleCommit(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        if (this.currentState.stagingArea.length === 0) {
            return { 
                success: false, 
                output: 'nothing to commit, working tree clean' 
            };
        }

        // Extract commit message
        let message = 'Update files';
        if (args.includes('-m')) {
            const msgIndex = args.indexOf('-m') + 1;
            if (msgIndex < args.length) {
                message = args[msgIndex].replace(/"/g, '');
            }
        }

        // Create commit
        this.commitCounter++;
        const commitHash = this.generateCommitHash();
        const commit = {
            hash: commitHash,
            message,
            files: [...this.currentState.stagingArea],
            timestamp: new Date(),
            branch: this.currentState.currentBranch,
            isMerge: false
        };

        // Add to commits
        this.currentState.commits.push(commit);
        
        // Update branch head
        const currentBranch = this.currentState.branches[this.currentState.currentBranch];
        if (currentBranch) {
            currentBranch.commits.push(commitHash);
            currentBranch.head = commitHash;
        }

        // Clear staging area
        this.currentState.stagingArea = [];
        
        // Update file states
        this.currentState.workingDirectory.forEach(file => {
            if (file.staged) {
                file.staged = false;
                file.committed = true;
            }
        });

        return { 
            success: true, 
            output: `[${this.currentState.currentBranch} ${commitHash.substring(0, 7)}] ${message}`,
            stateChange: true,
            commit: commit
        };
    }

    handleBranch(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        if (args.length === 0) {
            // List branches
            const branches = Object.keys(this.currentState.branches);
            const current = this.currentState.currentBranch;
            const output = branches.map(branch => 
                (branch === current ? '* ' : '  ') + branch
            ).join('\n');
            return { success: true, output };
        }

        const branchName = args[0];
        if (branchName.startsWith('-')) {
            // Handle branch flags like -d, -D
            return { 
                success: true, 
                output: `Branch operation with flag: ${branchName}` 
            };
        }

        // Create new branch
        this.currentState.branches[branchName] = {
            name: branchName,
            commits: [],
            head: null
        };

        return { 
            success: true, 
            output: `Created branch '${branchName}'`,
            stateChange: true
        };
    }

    handleSwitch(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        if (args.length === 0) {
            return { 
                success: false, 
                output: 'Missing branch name' 
            };
        }

        const targetBranch = args[0];
        if (targetBranch === '-') {
            // Switch to previous branch
            return { 
                success: true, 
                output: 'Switched to previous branch' 
            };
        }

        if (!this.currentState.branches[targetBranch]) {
            return { 
                success: false, 
                output: `error: pathspec '${targetBranch}' did not match any file(s) known to git` 
            };
        }

        const previousBranch = this.currentState.currentBranch;
        this.currentState.currentBranch = targetBranch;

        return { 
            success: true, 
            output: `Switched to branch '${targetBranch}'`,
            stateChange: true,
            branchSwitch: { from: previousBranch, to: targetBranch }
        };
    }

    handleMerge(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        if (args.length === 0) {
            return { 
                success: false, 
                output: 'Specify a branch to merge' 
            };
        }

        const branchToMerge = args[0];
        if (!this.currentState.branches[branchToMerge]) {
            return { 
                success: false, 
                output: `branch '${branchToMerge}' not found` 
            };
        }

        // Create merge commit
        this.commitCounter++;
        const commitHash = this.generateCommitHash();
        const mergeCommit = {
            hash: commitHash,
            message: `Merge branch '${branchToMerge}' into ${this.currentState.currentBranch}`,
            files: ['merged changes'],
            timestamp: new Date(),
            branch: this.currentState.currentBranch,
            isMerge: true,
            mergedFrom: branchToMerge
        };

        this.currentState.commits.push(mergeCommit);
        
        const currentBranch = this.currentState.branches[this.currentState.currentBranch];
        if (currentBranch) {
            currentBranch.commits.push(commitHash);
            currentBranch.head = commitHash;
        }

        return { 
            success: true, 
            output: `Merge made by recursive strategy.\nCreated merge commit ${commitHash.substring(0, 7)}`,
            stateChange: true,
            commit: mergeCommit
        };
    }

    handleStatus(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        const stagedCount = this.currentState.stagingArea.length;
        const modifiedCount = this.currentState.workingDirectory.filter(f => !f.committed).length;
        const untrackedCount = this.currentState.workingDirectory.filter(f => !f.staged && !f.committed).length;

        let output = `On branch ${this.currentState.currentBranch}\n`;
        
        if (this.currentState.commits.length === 0) {
            output += 'No commits yet\n';
        }
        
        if (stagedCount > 0) {
            output += 'Changes to be committed:\n';
            output += '  (use "git restore --staged <file>..." to unstage)\n';
            this.currentState.stagingArea.forEach(file => {
                output += `\tnew file:   ${file}\n`;
            });
        }
        
        if (modifiedCount > 0) {
            output += 'Changes not staged for commit:\n';
            output += '  (use "git add <file>..." to update what will be committed)\n';
        }
        
        if (untrackedCount > 0) {
            output += 'Untracked files:\n';
            output += '  (use "git add <file>..." to include in what will be committed)\n';
            this.currentState.workingDirectory
                .filter(f => !f.staged && !f.committed)
                .forEach(file => {
                    output += `\t${file.name}\n`;
                });
        }
        
        if (stagedCount === 0 && modifiedCount === 0 && untrackedCount === 0) {
            output += 'nothing to commit, working tree clean';
        }

        return { success: true, output };
    }

    handleLog(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        if (this.currentState.commits.length === 0) {
            return { success: true, output: 'No commits yet' };
        }

        let output = '';
        const showOneline = args.includes('--oneline');
        
        this.currentState.commits.slice().reverse().forEach(commit => {
            if (showOneline) {
                output += `${commit.hash.substring(0, 7)} ${commit.message}\n`;
            } else {
                output += `commit ${commit.hash}\n`;
                output += `Author: Developer <dev@project.local>\n`;
                output += `Date:   ${new Date(commit.timestamp).toLocaleString()}\n\n`;
                output += `    ${commit.message}\n\n`;
            }
        });

        return { success: true, output: output.trim() };
    }

    handleRemote(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        if (args.length === 0) {
            return { 
                success: false, 
                output: 'Usage: git remote <command>' 
            };
        }

        const subcommand = args[0];
        
        if (subcommand === 'add') {
            const remoteName = args[1];
            const remoteUrl = args[2];
            if (remoteName && remoteUrl) {
                this.currentState.remotes[remoteName] = remoteUrl;
                return { 
                    success: true, 
                    output: `Added remote '${remoteName}'`,
                    stateChange: true
                };
            }
        } else if (subcommand === '-v') {
            let output = '';
            Object.entries(this.currentState.remotes).forEach(([name, url]) => {
                output += `${name}\t${url} (fetch)\n`;
                output += `${name}\t${url} (push)\n`;
            });
            return { success: true, output: output || 'No remotes configured' };
        }

        return { success: true, output: `Remote command: ${subcommand}` };
    }

    handlePush(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        if (Object.keys(this.currentState.remotes).length === 0) {
            return { 
                success: false, 
                output: 'fatal: No configured push destination.' 
            };
        }

        const branch = args.includes('origin') ? args[args.indexOf('origin') + 1] : 'main';
        
        return { 
            success: true, 
            output: `Enumerating objects: ${this.currentState.commits.length}, done.\n` +
                   `Writing objects: 100% (${this.currentState.commits.length}/${this.currentState.commits.length}), done.\n` +
                   `To github.com:user/${this.projectName}.git\n` +
                   ` * [new branch]      ${branch} -> ${branch}`,
            stateChange: true
        };
    }

    handlePull(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        return { 
            success: true, 
            output: 'Already up to date.' 
        };
    }

    handleClone(args) {
        if (this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: destination path already exists and is not an empty directory.' 
            };
        }

        // Simulate clone by initializing and adding a remote
        this.currentState.isInitialized = true;
        this.currentState.remotes.origin = 'https://github.com/user/project.git';
        this.commitCounter = 1;
        const initialCommit = {
            hash: this.generateCommitHash(),
            message: 'Initial commit',
            files: ['README.md', 'main.py'],
            timestamp: new Date(),
            branch: 'main',
            isMerge: false
        };
        this.currentState.commits.push(initialCommit);
        this.currentState.branches.main.commits.push(initialCommit.hash);
        this.currentState.branches.main.head = initialCommit.hash;

        return { 
            success: true, 
            output: `Cloning into '${this.projectName}'...\n` +
                   'remote: Enumerating objects: 3, done.\n' +
                   'remote: Counting objects: 100% (3/3), done.\n' +
                   'remote: Total 3 (delta 0), reused 0 (delta 0), pack-reused 0\n' +
                   'Unpacking objects: 100% (3/3), done.',
            stateChange: true
        };
    }

    handleReset(args) {
        if (!this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'fatal: not a git repository' 
            };
        }

        const mode = args.includes('--hard') ? 'hard' : 
                    args.includes('--soft') ? 'soft' : 'mixed';
        
        // For simplicity, just unstage files in mixed mode
        if (mode === 'mixed' || mode === 'hard') {
            this.currentState.stagingArea = [];
            this.currentState.workingDirectory.forEach(file => {
                file.staged = false;
            });
        }

        return { 
            success: true, 
            output: `Reset ${mode} completed`,
            stateChange: true
        };
    }

    // Helper methods
    generateCommitHash() {
        return Math.random().toString(36).substring(2, 14);
    }

    getState() {
        return JSON.parse(JSON.stringify(this.currentState));
    }

    reset() {
        this.currentState = {
            isInitialized: false,
            currentBranch: 'main',
            branches: {
                main: {
                    name: 'main',
                    commits: [],
                    head: null
                }
            },
            commits: [],
            workingDirectory: [
                { name: 'main.py', type: 'python', staged: false, committed: false, content: '# Python main file' },
                { name: 'utils.py', type: 'python', staged: false, committed: false, content: '# Utility functions' },
                { name: 'requirements.txt', type: 'requirements', staged: false, committed: false, content: 'requests>=2.25.1' },
                { name: 'config.py', type: 'config', staged: false, committed: false, content: 'DEBUG = True' },
                { name: 'tests/test_main.py', type: 'test', staged: false, committed: false, content: 'import unittest' }
            ],
            stagingArea: [],
            remotes: {},
            tags: [],
            mergeInProgress: false,
            rebaseInProgress: false,
            detachedHEAD: false
        };
        this.commitCounter = 0;
        this.branchCounter = 1;
        this.commandHistory = [];
    }

    getFileTypeClass(file) {
        if (file.name.endsWith('.py')) return 'python';
        if (file.name.includes('requirements')) return 'requirements';
        if (file.name.includes('config')) return 'config';
        if (file.name.includes('test')) return 'test';
        return 'default';
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.GitTimelineCore = GitTimelineCore;
}