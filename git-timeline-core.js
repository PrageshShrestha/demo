// git-timeline-core.js
class GitTimelineCore {
    constructor(projectName = 'project_👍') {
        this.projectName = projectName;
        this.currentState = {
            isInitialized: false,
            currentBranch: 'master',
            detachedHEAD: null,                    // commit hash when in detached state
            branches: new Map([['master', null]]),   // branchName → head commit hash
            branchStates: new Map(),               // branchName → {workingDirectory, stagingArea}
            commits: new Map(),                    // hash → full commit object
            reflog: [],                            // [{hash?, action, timestamp, oldHead?, message}]
            remotes: {},
            tags: [],
            mergeInProgress: false,
            rebaseInProgress: false
        };
        this.commitCounter = 0;
        this.commandHistory = [];
    }

    executeCommand(command) {
        this.commandHistory.push({ command, timestamp: new Date() });
        const parts = command.trim().split(/\s+/);
        if (parts[0] !== 'git') {
            return { success: false, output: "Command must start with 'git'" };
        }
        const gitCmd = parts[1];
        const args = parts.slice(2);

        const handlers = {
            init:    () => this.handleInit(args),
            add:     () => this.handleAdd(args),
            commit:  () => this.handleCommit(args),
            branch:  () => this.handleBranch(args),
            switch:  () => this.handleSwitch(args),
            checkout:() => this.handleSwitch(args),
            merge:   () => this.handleMerge(args),
            status:  () => this.handleStatus(args),
            log:     () => this.handleLog(args),
            reflog:  () => this.handleReflog(),
            reset:   () => this.handleReset(args),
            rebase:  () => this.handleRebase(args),
            remote:  () => this.handleRemote(args),
            push:    () => this.handlePush(args),
            pull:    () => this.handlePull(args),
            clone:   () => this.handleClone(args),
        };

        const handler = handlers[gitCmd];
        if (!handler) {
            return { success: false, output: `git: '${gitCmd}' is not a git command.` };
        }

        return handler();
    }

    handleInit(args) {
        if (this.currentState.isInitialized) {
            return { 
                success: false, 
                output: 'Reinitialized existing Git repository' 
            };
        }

        this.currentState.isInitialized = true;
        this.currentState.currentBranch = 'master';
        this.currentState.branches.set('master', null);
        this.currentState.branchStates.set('master', {
            workingDirectory: [
                { name: 'main.py', type: 'python', staged: false, committed: false, content: '# Python main file\nprint("Hello World")' },
                { name: 'utils.py', type: 'python', staged: false, committed: false, content: '# Utility functions\ndef helper():\n    pass' },
                { name: 'requirements.txt', type: 'requirements', staged: false, committed: false, content: 'requests>=2.25.1\nflask>=2.0.0' },
                { name: 'config.py', type: 'config', staged: false, committed: false, content: 'DEBUG = True\nPORT = 5000' },
                { name: 'README.md', type: 'markdown', staged: false, committed: false, content: '# Project_👍\n\nA Python project with Git visualization.' },
                { name: 'tests', type: 'dir', staged: false, committed: false, content: [] }
            ],
            stagingArea: []
        });

        this.currentState.reflog.push({
            action: 'init',
            timestamp: new Date(),
            message: 'repository initialized'
        });

        return { 
            success: true, 
            output: `Initialized empty Git repository in ${this.projectName}/.git/`,
            stateChange: true
        };
    }

    handleAdd(args) {
        if (!this.currentState.isInitialized) return { success: false, output: "fatal: not a git repository" };

        const state = this.getCurrentBranchState();
        const added = [];

        args.forEach(arg => {
            if (arg === '.') {
                state.workingDirectory.forEach(f => {
                    if (!f.staged && !state.stagingArea.includes(f.name)) {
                        f.staged = true;
                        state.stagingArea.push(f.name);
                        added.push(f.name);
                    }
                });
            } else {
                const file = state.workingDirectory.find(f => f.name === arg);
                if (file && !file.staged) {
                    file.staged = true;
                    state.stagingArea.push(arg);
                    added.push(arg);
                }
            }
        });

        return {
            success: added.length > 0,
            output: added.length ? `Added ${added.length} file(s) to staging area` : "nothing added",
            stateChange: added.length > 0
        };
    }

    handleCommit(args) {
        if (!this.currentState.isInitialized) return { success: false, output: "fatal: not a git repository" };

        const state = this.getCurrentBranchState();
        if (state.stagingArea.length === 0) {
            return { success: false, output: "nothing to commit, working tree clean" };
        }

        let message = args.includes('-m') ? args[args.indexOf('-m') + 1] || "no message" : "no message";

        const snapshot = state.workingDirectory.map(f => ({
            name: f.name,
            type: f.type,
            content: f.content || "",
            staged: false,
            committed: true
        }));

        const hash = this.generateCommitHash();
        const currentHead = this.currentState.detachedHEAD || this.currentState.branches.get(this.currentState.currentBranch);
        const parents = currentHead ? [currentHead] : [];

        const commit = {
            hash,
            message,
            parents,
            timestamp: new Date(),
            branch: this.currentState.currentBranch,
            isMerge: false,
            snapshot,
            filesChanged: state.stagingArea.length
        };

        this.currentState.commits.set(hash, commit);

        // Update head
        if (this.currentState.detachedHEAD) {
            this.currentState.detachedHEAD = hash;
        } else {
            this.currentState.branches.set(this.currentState.currentBranch, hash);
        }

        // Clear staging, mark files committed
        state.stagingArea = [];
        state.workingDirectory.forEach(f => { f.staged = false; f.committed = true; });

        this.currentState.reflog.push({
            hash,
            action: 'commit',
            timestamp: new Date(),
            oldHead: currentHead,
            message
        });

        return {
            success: true,
            output: `[${this.currentState.currentBranch} ${hash.slice(0,7)}] ${message}`,
            stateChange: true,
            commit
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
    getCurrentBranchState() {
        const key = this.currentState.detachedHEAD || this.currentState.currentBranch;
        let s = this.currentState.branchStates.get(key);
        if (!s) {
            s = { workingDirectory: [], stagingArea: [] };
            this.currentState.branchStates.set(key, s);
        }
        return s;
    }

    generateCommitHash() {
        return 'commit_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    }

    resolveRef(ref) {
        if (ref === 'HEAD') return this.currentState.detachedHEAD || this.currentState.branches.get(this.currentState.currentBranch);
        if (this.currentState.branches.has(ref)) return this.currentState.branches.get(ref);
        if (this.currentState.commits.has(ref)) return ref;
        return null;
    }

    getAncestorHash(ref) {
        // Simple implementation for HEAD~n
        if (ref.startsWith('HEAD~')) {
            const n = parseInt(ref.slice(5)) || 1;
            let current = this.currentState.detachedHEAD || this.currentState.branches.get(this.currentState.currentBranch);
            for (let i = 0; i < n && current; i++) {
                const commit = this.currentState.commits.get(current);
                if (!commit || !commit.parents[0]) break;
                current = commit.parents[0];
            }
            return current;
        }
        return null;
    }

    getState() {
        return JSON.parse(JSON.stringify(this.currentState)); // for visualization
    }

    reset() {
        this.currentState = {
            isInitialized: false,
            currentBranch: 'master',
            detachedHEAD: null,
            branches: new Map([['master', null]]),
            branchStates: new Map(),
            commits: new Map(),
            reflog: [],
            remotes: {},
            tags: [],
            mergeInProgress: false,
            rebaseInProgress: false
        };
        this.commitCounter = 0;
        this.commandHistory = [];
    }
}

// Export
if (typeof window !== 'undefined') window.GitTimelineCore = GitTimelineCore;