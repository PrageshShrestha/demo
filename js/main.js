// Git Visualizer Main JavaScript
class GitVisualizer {
    constructor() {
        this.currentScene = 0;
        this.isPlaying = false;
        this.playInterval = null;
        this.scenes = this.initializeScenes();
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTabEventListeners();
        this.renderNavigation();
        this.loadScene(0);
        this.updateProgress();
        this.setupLegendInfo();
    }

    initializeScenes() {
        return [
            {
                id: 'git-init',
                title: 'git init',
                description: 'Initialize a new Git repository',
                command: 'git init',
                details: 'Creates a new Git repository. It creates a hidden .git directory that contains all the necessary files and directories for Git to track changes.',
                syntax: 'git init [directory-name]',
                render: () => this.renderGitInit(),
                relatedCommands: [
                    {
                        command: 'git clone',
                        description: 'Clone an existing repository',
                        usage: 'Copy a remote repository to your local machine',
                        syntax: 'git clone <url>',
                        visualAid: 'Downloads entire repository with all history'
                    },
                    {
                        command: 'git status',
                        description: 'Check repository status',
                        usage: 'See current state of files and branches',
                        syntax: 'git status',
                        visualAid: 'Shows working directory and staging area state'
                    },
                    {
                        command: 'git config',
                        description: 'Configure Git settings',
                        usage: 'Set up user name and email for commits',
                        syntax: 'git config --global user.name "Name"',
                        visualAid: 'Sets configuration variables for Git behavior'
                    },
                    {
                        command: 'git remote',
                        description: 'Manage remote repositories',
                        usage: 'Add or remove remote repository connections',
                        syntax: 'git remote add origin <url>',
                        visualAid: 'Links local repo to remote repository'
                    },
                    {
                        command: 'git log --oneline',
                        description: 'Show commit history briefly',
                        usage: 'View condensed commit history',
                        syntax: 'git log --oneline -5',
                        visualAid: 'Displays commit hashes and messages in compact form'
                    }
                ]
            },
            {
                id: 'git-add',
                title: 'git add',
                description: 'Add files to staging area',
                command: 'git add',
                details: 'Adds files to the staging area, preparing them for the next commit. You can add specific files or use patterns.',
                syntax: 'git add <file-pattern>',
                render: () => this.renderGitAdd(),
                relatedCommands: [
                    {
                        command: 'git reset',
                        description: 'Unstage files',
                        usage: 'Remove files from staging area',
                        syntax: 'git reset <file>',
                        visualAid: 'Moves files from staging back to working directory'
                    },
                    {
                        command: 'git restore',
                        description: 'Restore working tree files',
                        usage: 'Discard changes in working directory',
                        syntax: 'git restore <file>',
                        visualAid: 'Reverts files to last committed state'
                    },
                    {
                        command: 'git diff',
                        description: 'Show file differences',
                        usage: 'See changes between commits or working tree',
                        syntax: 'git diff --staged',
                        visualAid: 'Displays line-by-line changes'
                    },
                    {
                        command: 'git add -p',
                        description: 'Add files interactively',
                        usage: 'Stage changes in chunks',
                        syntax: 'git add -p <file>',
                        visualAid: 'Allows selective staging of changes'
                    },
                    {
                        command: 'git clean',
                        description: 'Remove untracked files',
                        usage: 'Clean up working directory',
                        syntax: 'git clean -fd',
                        visualAid: 'Deletes untracked files and directories'
                    }
                ]
            },
            {
                id: 'git-commit',
                title: 'git commit',
                description: 'Create a new commit',
                command: 'git commit',
                details: 'Records changes to the repository. Creates a snapshot of the currently staged changes.',
                syntax: 'git commit -m "Commit message"',
                render: () => this.renderGitCommit(),
                relatedCommands: [
                    {
                        command: 'git commit --amend',
                        description: 'Modify last commit',
                        usage: 'Edit the most recent commit',
                        syntax: 'git commit --amend -m "New message"',
                        visualAid: 'Combines staged changes with last commit'
                    },
                    {
                        command: 'git reset --soft',
                        description: 'Undo last commit softly',
                        usage: 'Keep changes staged but remove commit',
                        syntax: 'git reset --soft HEAD~1',
                        visualAid: 'Moves HEAD back but keeps changes staged'
                    },
                    {
                        command: 'git revert',
                        description: 'Revert a commit',
                        usage: 'Create new commit that undoes changes',
                        syntax: 'git revert <commit-hash>',
                        visualAid: 'Creates inverse commit to cancel changes'
                    },
                    {
                        command: 'git cherry-pick',
                        description: 'Apply specific commit',
                        usage: 'Apply commit from another branch',
                        syntax: 'git cherry-pick <commit-hash>',
                        visualAid: 'Copies specific commit to current branch'
                    },
                    {
                        command: 'git rebase -i',
                        description: 'Interactive rebase',
                        usage: 'Rewrite multiple commits',
                        syntax: 'git rebase -i HEAD~3',
                        visualAid: 'Allows editing, reordering, or squashing commits'
                    }
                ]
            },
            {
                id: 'git-status',
                title: 'git status',
                description: 'Show repository status',
                command: 'git status',
                details: 'Shows the state of the working directory and staging area. Displays which changes are staged, unstaged, and untracked.',
                syntax: 'git status',
                render: () => this.renderGitStatus(),
                relatedCommands: [
                    {
                        command: 'git status -s',
                        description: 'Short status format',
                        usage: 'Get compact status output',
                        syntax: 'git status -s',
                        visualAid: 'Shows status in two-letter format'
                    },
                    {
                        command: 'git status --ignored',
                        description: 'Show ignored files',
                        usage: 'Include ignored files in output',
                        syntax: 'git status --ignored',
                        visualAid: 'Displays files ignored by .gitignore'
                    },
                    {
                        command: 'git ls-files',
                        description: 'List tracked files',
                        usage: 'Show all files in index',
                        syntax: 'git ls-files',
                        visualAid: 'Lists all files Git is tracking'
                    },
                    {
                        command: 'git diff --name-only',
                        description: 'Show changed files only',
                        usage: 'List modified files without content',
                        syntax: 'git diff --name-only',
                        visualAid: 'Shows just filenames of changed files'
                    },
                    {
                        command: 'git stash list',
                        description: 'Show stashed changes',
                        usage: 'List all stashed changes',
                        syntax: 'git stash list',
                        visualAid: 'Displays all saved stashes'
                    }
                ]
            },
            {
                id: 'git-log',
                title: 'git log',
                description: 'Show commit history',
                command: 'git log',
                details: 'Displays the commit history. Shows commit hashes, authors, dates, and commit messages.',
                syntax: 'git log --oneline --graph',
                render: () => this.renderGitLog(),
                relatedCommands: [
                    {
                        command: 'git log --graph',
                        description: 'Show commit graph',
                        usage: 'Visualize branch structure',
                        syntax: 'git log --graph --oneline',
                        visualAid: 'Displays ASCII graph of branch merges'
                    },
                    {
                        command: 'git log --grep',
                        description: 'Search commit messages',
                        usage: 'Find commits by message content',
                        syntax: 'git log --grep "bug fix"',
                        visualAid: 'Filters commits by message pattern'
                    },
                    {
                        command: 'git log --author',
                        description: 'Filter by author',
                        usage: 'Show commits by specific author',
                        syntax: 'git log --author "John"',
                        visualAid: 'Displays commits from specific author'
                    },
                    {
                        command: 'git log --since',
                        description: 'Filter by date range',
                        usage: 'Show commits within time period',
                        syntax: 'git log --since "2 weeks ago"',
                        visualAid: 'Filters commits by date criteria'
                    },
                    {
                        command: 'git show',
                        description: 'Show commit details',
                        usage: 'Display specific commit information',
                        syntax: 'git show <commit-hash>',
                        visualAid: 'Shows detailed commit with changes'
                    }
                ]
            },
            {
                id: 'git-branch',
                title: 'git branch',
                description: 'Manage branches',
                command: 'git branch',
                details: 'Lists, creates, or deletes branches. Branches allow you to develop features independently.',
                syntax: 'git branch <branch-name>',
                render: () => this.renderGitBranch(),
                relatedCommands: [
                    {
                        command: 'git branch -a',
                        description: 'List all branches',
                        usage: 'Show local and remote branches',
                        syntax: 'git branch -a',
                        visualAid: 'Displays all branch references'
                    },
                    {
                        command: 'git branch -d',
                        description: 'Delete branch',
                        usage: 'Remove merged branch',
                        syntax: 'git branch -d <branch-name>',
                        visualAid: 'Safely deletes merged branches'
                    },
                    {
                        command: 'git branch -m',
                        description: 'Rename branch',
                        usage: 'Change branch name',
                        syntax: 'git branch -m <old-name> <new-name>',
                        visualAid: 'Renames branch reference'
                    },
                    {
                        command: 'git branch --merged',
                        description: 'Show merged branches',
                        usage: 'List branches that are merged',
                        syntax: 'git branch --merged',
                        visualAid: 'Shows branches safe to delete'
                    },
                    {
                        command: 'git branch --no-merged',
                        description: 'Show unmerged branches',
                        usage: 'List branches with unique commits',
                        syntax: 'git branch --no-merged',
                        visualAid: 'Shows branches containing unique work'
                    }
                ]
            },
            {
                id: 'git-checkout',
                title: 'git checkout',
                description: 'Switch branches or restore files',
                command: 'git checkout',
                details: 'Switches between branches or restores working tree files. Also used for creating new branches.',
                syntax: 'git checkout <branch-name>',
                render: () => this.renderGitCheckout(),
                relatedCommands: [
                    {
                        command: 'git switch',
                        description: 'Switch branches',
                        usage: 'Modern way to switch branches',
                        syntax: 'git switch <branch-name>',
                        visualAid: 'Moves HEAD to different branch'
                    },
                    {
                        command: 'git checkout -b',
                        description: 'Create and switch branch',
                        usage: 'Make new branch and switch to it',
                        syntax: 'git checkout -b <branch-name>',
                        visualAid: 'Creates branch and moves HEAD'
                    },
                    {
                        command: 'git checkout --',
                        description: 'Restore files',
                        usage: 'Discard changes to files',
                        syntax: 'git checkout -- <file>',
                        visualAid: 'Reverts files to last commit'
                    },
                    {
                        command: 'git checkout <commit>',
                        description: 'Checkout commit',
                        usage: 'Go to specific commit',
                        syntax: 'git checkout <commit-hash>',
                        visualAid: 'Puts repo in detached HEAD state'
                    },
                    {
                        command: 'git restore',
                        description: 'Restore files',
                        usage: 'Modern file restoration',
                        syntax: 'git restore <file>',
                        visualAid: 'Reverts working directory files'
                    }
                ]
            },
            {
                id: 'git-merge',
                title: 'git merge',
                description: 'Merge branches',
                command: 'git merge',
                details: 'Merges changes from one branch into another. Combines the histories of two branches.',
                syntax: 'git merge <branch-name>',
                render: () => this.renderGitMerge(),
                relatedCommands: [
                    {
                        command: 'git merge --no-ff',
                        description: 'No fast-forward merge',
                        usage: 'Always create merge commit',
                        syntax: 'git merge --no-ff <branch>',
                        visualAid: 'Preserves branch history'
                    },
                    {
                        command: 'git merge --squash',
                        description: 'Squash merge',
                        usage: 'Combine commits into one',
                        syntax: 'git merge --squash <branch>',
                        visualAid: 'Flattens branch into single commit'
                    },
                    {
                        command: 'git merge --abort',
                        description: 'Abort merge',
                        usage: 'Cancel conflicted merge',
                        syntax: 'git merge --abort',
                        visualAid: 'Returns to pre-merge state'
                    },
                    {
                        command: 'git mergetool',
                        description: 'Launch merge tool',
                        usage: 'Resolve conflicts visually',
                        syntax: 'git mergetool',
                        visualAid: 'Opens external merge resolution tool'
                    },
                    {
                        command: 'git diff --name-only',
                        description: 'Show conflicted files',
                        usage: 'List files with conflicts',
                        syntax: 'git diff --name-only --diff-filter=U',
                        visualAid: 'Shows unmerged conflict files'
                    }
                ]
            },
            {
                id: 'git-pull',
                title: 'git pull',
                description: 'Fetch and merge changes',
                command: 'git pull',
                details: 'Fetches changes from a remote repository and merges them into the current branch.',
                syntax: 'git pull origin <branch-name>',
                render: () => this.renderGitPull(),
                relatedCommands: [
                    {
                        command: 'git fetch',
                        description: 'Fetch changes only',
                        usage: 'Download remote changes without merging',
                        syntax: 'git fetch origin',
                        visualAid: 'Updates remote tracking branches'
                    },
                    {
                        command: 'git pull --rebase',
                        description: 'Pull with rebase',
                        usage: 'Rebase local commits on top of remote',
                        syntax: 'git pull --rebase origin <branch>',
                        visualAid: 'Linearizes commit history'
                    },
                    {
                        command: 'git pull --no-ff',
                        description: 'Pull without fast-forward',
                        usage: 'Always create merge commit',
                        syntax: 'git pull --no-ff origin <branch>',
                        visualAid: 'Preserves branch structure'
                    },
                    {
                        command: 'git log FETCH_HEAD',
                        description: 'Show fetched changes',
                        usage: 'Review changes before merging',
                        syntax: 'git log FETCH_HEAD..HEAD',
                        visualAid: 'Shows what will be merged'
                    },
                    {
                        command: 'git merge FETCH_HEAD',
                        description: 'Merge fetched changes',
                        usage: 'Manual merge after fetch',
                        syntax: 'git merge FETCH_HEAD',
                        visualAid: 'Two-step pull process'
                    }
                ]
            },
            {
                id: 'git-push',
                title: 'git push',
                description: 'Push changes to remote',
                command: 'git push',
                details: 'Pushes local commits to a remote repository. Updates the remote with your changes.',
                syntax: 'git push origin <branch-name>',
                render: () => this.renderGitPush(),
                relatedCommands: [
                    {
                        command: 'git push -u',
                        description: 'Push and set upstream',
                        usage: 'Push and link local to remote branch',
                        syntax: 'git push -u origin <branch>',
                        visualAid: 'Sets tracking relationship'
                    },
                    {
                        command: 'git push --force',
                        description: 'Force push',
                        usage: 'Overwrite remote history',
                        syntax: 'git push --force origin <branch>',
                        visualAid: 'Rewrites remote branch history'
                    },
                    {
                        command: 'git push --tags',
                        description: 'Push tags',
                        usage: 'Upload all tags to remote',
                        syntax: 'git push --tags origin',
                        visualAid: 'Sends annotated and lightweight tags'
                    },
                    {
                        command: 'git push --delete',
                        description: 'Delete remote branch',
                        usage: 'Remove branch from remote',
                        syntax: 'git push origin --delete <branch>',
                        visualAid: 'Removes branch reference on remote'
                    },
                    {
                        command: 'git log --oneline origin/main..HEAD',
                        description: 'Show commits to push',
                        usage: 'Review what will be pushed',
                        syntax: 'git log --oneline origin/main..HEAD',
                        visualAid: 'Shows commits ahead of remote'
                    }
                ]
            }
        ];
    }

    setupEventListeners() {
        document.getElementById('prev').addEventListener('click', () => this.previousScene());
        document.getElementById('next').addEventListener('click', () => this.nextScene());
        document.getElementById('play').addEventListener('click', () => this.toggleAutoPlay());

        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case 'ArrowLeft':
                    this.previousScene();
                    break;
                case 'ArrowRight':
                    this.nextScene();
                    break;
                case ' ':
                    e.preventDefault();
                    this.toggleAutoPlay();
                    break;
            }
        });
    }

    setupLegendInfo() {
        const infoBtn = document.getElementById('legendInfoBtn');
        const description = document.getElementById('legendDescription');
        
        if (infoBtn && description) {
            infoBtn.addEventListener('click', () => {
                description.classList.toggle('show');
                infoBtn.textContent = description.classList.contains('show') ? '×' : '?';
            });
        }
    }

    setupTabEventListeners() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabName = button.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchTab(tabName) {
        // Update button states
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        // Update tab panes
        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });

        // Load related commands when switching to related tab
        if (tabName === 'related') {
            this.renderRelatedCommands();
        }
    }

    renderRelatedCommands() {
        const scene = this.scenes[this.currentScene];
        const relatedCommandsContainer = document.getElementById('relatedCommands');
        
        if (!scene.relatedCommands || !relatedCommandsContainer) {
            relatedCommandsContainer.innerHTML = '<p class="text-muted">No related commands available for this command.</p>';
            return;
        }

        const relatedCommandsHTML = scene.relatedCommands.map(cmd => `
            <div class="related-command-item">
                <div class="related-command-header">
                    <span class="related-command-name">${cmd.command}</span>
                </div>
                <div class="related-command-description">${cmd.description}</div>
                <div class="related-command-usage">${cmd.usage}</div>
                <div class="related-command-syntax">${cmd.syntax}</div>
                <div class="related-command-visual">
                    <div class="visual-aid-icon">👁</div>
                    <div class="visual-aid-text">${cmd.visualAid}</div>
                </div>
            </div>
        `).join('');

        relatedCommandsContainer.innerHTML = relatedCommandsHTML;

        // Add click handlers to related command items
        const relatedItems = relatedCommandsContainer.querySelectorAll('.related-command-item');
        relatedItems.forEach(item => {
            item.addEventListener('click', () => {
                this.animateRelatedCommandClick(item);
            });
        });
    }

    animateRelatedCommandClick(item) {
        gsap.to(item, {
            scale: 0.98,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        });
    }

    renderNavigation() {
        const navWrapper = document.querySelector('.nav-wrapper');
        navWrapper.innerHTML = '';

        this.scenes.forEach((scene, index) => {
            const button = document.createElement('button');
            button.className = `nav-btn ${index === this.currentScene ? 'active' : ''}`;
            button.textContent = scene.title;
            button.addEventListener('click', () => this.loadScene(index));
            navWrapper.appendChild(button);
        });
    }

    loadScene(index) {
        if (index < 0 || index >= this.scenes.length) return;
        
        this.currentScene = index;
        const scene = this.scenes[index];
        
        document.querySelector('.status-command').textContent = scene.command;
        document.querySelector('.status-description').textContent = scene.description;
        
        document.getElementById('commandInfo').innerHTML = `
            <p class="command-description">
                <strong>${scene.command}</strong> ${scene.details}
            </p>
            <div class="command-syntax">
                <code>${scene.syntax}</code>
            </div>
        `;
        
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = '';
        scene.render();
        
        // Reset to main tab when loading new scene
        this.switchTab('main');
        
        this.updateNavigation();
        this.updateProgress();
        
        this.animateSceneEntrance();
    }

    updateNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach((btn, index) => {
            btn.classList.toggle('active', index === this.currentScene);
        });
    }

    updateProgress() {
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        const progress = ((this.currentScene + 1) / this.scenes.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${this.currentScene + 1} / ${this.scenes.length}`;
    }

    previousScene() {
        if (this.currentScene > 0) {
            this.loadScene(this.currentScene - 1);
        }
    }

    nextScene() {
        if (this.currentScene < this.scenes.length - 1) {
            this.loadScene(this.currentScene + 1);
        }
    }

    toggleAutoPlay() {
        const playButton = document.getElementById('play');
        
        if (this.isPlaying) {
            this.stopAutoPlay();
            playButton.classList.remove('playing');
            playButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
                Auto Play
            `;
        } else {
            this.startAutoPlay();
            playButton.classList.add('playing');
            playButton.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 6h4v12H6zM14 6h4v12h-4z"/>
                </svg>
                Pause
            `;
        }
    }

    startAutoPlay() {
        this.isPlaying = true;
        this.playInterval = setInterval(() => {
            if (this.currentScene < this.scenes.length - 1) {
                this.nextScene();
            } else {
                this.stopAutoPlay();
                this.toggleAutoPlay();
            }
        }, 3000);
    }

    stopAutoPlay() {
        this.isPlaying = false;
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    animateSceneEntrance() {
        const svg = document.getElementById('gitBoard');
        gsap.fromTo(svg, 
            { opacity: 0, scale: 0.9 },
            { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" }
        );
    }

    renderGitInit() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(600, 250)">
                <rect x="-60" y="-40" width="120" height="80" fill="#151932" stroke="#00ff9d" stroke-width="2" rx="8"/>
                <text x="0" y="-10" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="14" font-weight="bold">.git</text>
                <text x="0" y="10" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="11">Repository</text>
                <text x="0" y="30" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="11">Initialized</text>
            </g>
        `;
    }

    renderGitAdd() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(200, 200)">
                <rect x="-80" y="-60" width="160" height="120" fill="#151932" stroke="#64748b" stroke-width="2" rx="8"/>
                <text x="0" y="-35" text-anchor="middle" fill="#64748b" font-family="JetBrains Mono" font-size="12">Working Directory</text>
                <circle cx="-30" cy="0" r="8" fill="#ffaa00"/>
                <text x="-30" y="25" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">file.js</text>
                <circle cx="30" cy="0" r="8" fill="#ffaa00"/>
                <text x="30" y="25" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">style.css</text>
            </g>
            
            <path d="M 320 200 L 480 200" stroke="#00ff9d" stroke-width="3" marker-end="url(#arrowhead)"/>
            <text x="400" y="190" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="11">git add</text>
            
            <g transform="translate(600, 200)">
                <rect x="-80" y="-60" width="160" height="120" fill="#151932" stroke="#00ff9d" stroke-width="2" rx="8"/>
                <text x="0" y="-35" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="12">Staging Area</text>
                <circle cx="-30" cy="0" r="8" fill="#00cc66"/>
                <text x="-30" y="25" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">file.js</text>
                <circle cx="30" cy="0" r="8" fill="#00cc66"/>
                <text x="30" y="25" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">style.css</text>
            </g>
            
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#00ff9d"/>
                </marker>
            </defs>
        `;
    }

    renderGitCommit() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(200, 250)">
                <circle cx="0" cy="0" r="12" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                <text x="0" y="5" text-anchor="middle" fill="#0a0e27" font-family="JetBrains Mono" font-size="10" font-weight="bold">C1</text>
                <text x="0" y="-25" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">Initial commit</text>
            </g>
            
            <line x1="212" y1="250" x2="388" y2="250" stroke="#00ff9d" stroke-width="3"/>
            
            <g transform="translate(400, 250)">
                <circle cx="0" cy="0" r="12" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                <text x="0" y="5" text-anchor="middle" fill="#0a0e27" font-family="JetBrains Mono" font-size="10" font-weight="bold">C2</text>
                <text x="0" y="-25" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">Add features</text>
            </g>
            
            <line x1="412" y1="250" x2="588" y2="250" stroke="#00ff9d" stroke-width="3"/>
            
            <g transform="translate(600, 250)">
                <circle cx="0" cy="0" r="12" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                <text x="0" y="5" text-anchor="middle" fill="#0a0e27" font-family="JetBrains Mono" font-size="10" font-weight="bold">C3</text>
                <text x="0" y="-25" text-anchor="middle" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">Fix bugs</text>
            </g>
            
            <g transform="translate(600, 250)">
                <path d="M 0 -20 L 0 -35" stroke="#ff2a6d" stroke-width="2" marker-end="url(#head-arrow)"/>
                <text x="0" y="-40" text-anchor="middle" fill="#ff2a6d" font-family="JetBrains Mono" font-size="12" font-weight="bold">HEAD</text>
            </g>
            
            <defs>
                <marker id="head-arrow" markerWidth="10" markerHeight="7" refX="5" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ff2a6d"/>
                </marker>
            </defs>
        `;
    }

    renderGitStatus() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(600, 200)">
                <rect x="-200" y="-80" width="400" height="160" fill="#151932" stroke="#00ff9d" stroke-width="2" rx="8"/>
                <text x="0" y="-50" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="14" font-weight="bold">git status</text>
                
                <text x="-180" y="-20" fill="#ffaa00" font-family="JetBrains Mono" font-size="11">Changes not staged for commit:</text>
                <text x="-160" y="0" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">modified:   src/app.js</text>
                <text x="-160" y="20" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">deleted:    old-file.js</text>
                
                <text x="-180" y="50" fill="#00cc66" font-family="JetBrains Mono" font-size="11">Changes to be committed:</text>
                <text x="-160" y="70" fill="#a8b2d1" font-family="JetBrains Mono" font-size="10">new file:   component.jsx</text>
            </g>
        `;
    }

    renderGitLog() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(100, 100)">
                <text x="0" y="-20" fill="#00ff9d" font-family="JetBrains Mono" font-size="14" font-weight="bold">git log --oneline --graph</text>
                
                <g transform="translate(50, 20)">
                    <circle cx="0" cy="0" r="8" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                    <text x="20" y="5" fill="#a8b2d1" font-family="JetBrains Mono" font-size="11">* a3f2c1 (HEAD -> main) Fix critical bug</text>
                    
                    <line x1="0" y1="8" x2="0" y2="32" stroke="#00ff9d" stroke-width="2"/>
                    <circle cx="0" cy="40" r="8" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                    <text x="20" y="45" fill="#a8b2d1" font-family="JetBrains Mono" font-size="11">* b8e4d2 Add new feature</text>
                    
                    <line x1="0" y1="48" x2="0" y2="72" stroke="#00ff9d" stroke-width="2"/>
                    <circle cx="0" cy="80" r="8" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                    <text x="20" y="85" fill="#a8b2d1" font-family="JetBrains Mono" font-size="11">* c5f6a3 Initial commit</text>
                </g>
            </g>
        `;
    }

    renderGitBranch() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(200, 200)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                <text x="0" y="-20" text-anchor="middle" fill="#ffaa00" font-family="JetBrains Mono" font-size="11">main</text>
            </g>
            
            <line x1="210" y1="200" x2="390" y2="200" stroke="#00ff9d" stroke-width="3"/>
            
            <g transform="translate(400, 200)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
            </g>
            
            <line x1="400" y1="190" x2="400" y2="140" stroke="#ffaa00" stroke-width="3"/>
            <line x1="400" y1="140" x2="580" y2="140" stroke="#ffaa00" stroke-width="3"/>
            
            <g transform="translate(600, 140)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#ffaa00" stroke-width="2"/>
                <text x="0" y="-20" text-anchor="middle" fill="#ffaa00" font-family="JetBrains Mono" font-size="11">feature</text>
            </g>
            
            <text x="400" y="250" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="12">git branch feature</text>
        `;
    }

    renderGitCheckout() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(200, 200)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                <text x="0" y="-20" text-anchor="middle" fill="#64748b" font-family="JetBrains Mono" font-size="11">main</text>
            </g>
            
            <line x1="210" y1="200" x2="390" y2="200" stroke="#00ff9d" stroke-width="3"/>
            
            <g transform="translate(400, 200)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
            </g>
            
            <line x1="400" y1="190" x2="400" y2="140" stroke="#ffaa00" stroke-width="3"/>
            <line x1="400" y1="140" x2="580" y2="140" stroke="#ffaa00" stroke-width="3"/>
            
            <g transform="translate(600, 140)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#ffaa00" stroke-width="2"/>
                <text x="0" y="-20" text-anchor="middle" fill="#ffaa00" font-family="JetBrains Mono" font-size="11">feature</text>
            </g>
            
            <g transform="translate(600, 140)">
                <path d="M 0 -15 L 0 -30" stroke="#ff2a6d" stroke-width="2" marker-end="url(#head-arrow)"/>
                <text x="0" y="-35" text-anchor="middle" fill="#ff2a6d" font-family="JetBrains Mono" font-size="12" font-weight="bold">HEAD</text>
            </g>
            
            <text x="400" y="280" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="12">git checkout feature</text>
            
            <defs>
                <marker id="head-arrow" markerWidth="10" markerHeight="7" refX="5" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#ff2a6d"/>
                </marker>
            </defs>
        `;
    }

    renderGitMerge() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(200, 200)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                <text x="0" y="-20" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="11">main</text>
            </g>
            
            <line x1="210" y1="200" x2="390" y2="200" stroke="#00ff9d" stroke-width="3"/>
            
            <g transform="translate(400, 200)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
            </g>
            
            <line x1="400" y1="190" x2="400" y2="140" stroke="#ffaa00" stroke-width="3"/>
            <line x1="400" y1="140" x2="580" y2="140" stroke="#ffaa00" stroke-width="3"/>
            
            <g transform="translate(600, 140)">
                <circle cx="0" cy="0" r="10" fill="#00cc66" stroke="#ffaa00" stroke-width="2"/>
                <text x="0" y="-20" text-anchor="middle" fill="#ffaa00" font-family="JetBrains Mono" font-size="11">feature</text>
            </g>
            
            <line x1="600" y1="150" x2="600" y2="190" stroke="#00ff9d" stroke-width="3"/>
            <line x1="600" y1="200" x2="780" y2="200" stroke="#00ff9d" stroke-width="3"/>
            
            <g transform="translate(800, 200)">
                <circle cx="0" cy="0" r="12" fill="#00cc66" stroke="#00ff9d" stroke-width="2"/>
                <text x="0" y="5" text-anchor="middle" fill="#0a0e27" font-family="JetBrains Mono" font-size="10" font-weight="bold">M</text>
                <text x="0" y="-25" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="11">Merge</text>
            </g>
            
            <text x="400" y="280" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="12">git merge feature</text>
        `;
    }

    renderGitPull() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(200, 150)">
                <rect x="-60" y="-40" width="120" height="80" fill="#151932" stroke="#00aaff" stroke-width="2" rx="8"/>
                <text x="0" y="-15" text-anchor="middle" fill="#00aaff" font-family="JetBrains Mono" font-size="12">origin/main</text>
                <circle cx="-20" cy="10" r="6" fill="#00cc66"/>
                <circle cx="0" cy="10" r="6" fill="#00cc66"/>
                <circle cx="20" cy="10" r="6" fill="#00cc66"/>
            </g>
            
            <path d="M 260 170 L 340 170" stroke="#00aaff" stroke-width="3" stroke-dasharray="5,5" marker-end="url(#remote-arrow)"/>
            <text x="300" y="160" text-anchor="middle" fill="#00aaff" font-family="JetBrains Mono" font-size="11">git pull</text>
            
            <g transform="translate(400, 150)">
                <rect x="-60" y="-40" width="120" height="80" fill="#151932" stroke="#00ff9d" stroke-width="2" rx="8"/>
                <text x="0" y="-15" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="12">main</text>
                <circle cx="-20" cy="10" r="6" fill="#00cc66"/>
                <circle cx="0" cy="10" r="6" fill="#00cc66"/>
                <circle cx="20" cy="10" r="6" fill="#00cc66"/>
            </g>
            
            <defs>
                <marker id="remote-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#00aaff"/>
                </marker>
            </defs>
        `;
    }

    renderGitPush() {
        const svg = document.getElementById('gitBoard');
        svg.innerHTML = `
            <g transform="translate(200, 150)">
                <rect x="-60" y="-40" width="120" height="80" fill="#151932" stroke="#00ff9d" stroke-width="2" rx="8"/>
                <text x="0" y="-15" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="12">main</text>
                <circle cx="-20" cy="10" r="6" fill="#00cc66"/>
                <circle cx="0" cy="10" r="6" fill="#00cc66"/>
                <circle cx="20" cy="10" r="6" fill="#00cc66"/>
            </g>
            
            <path d="M 260 170 L 340 170" stroke="#00ff9d" stroke-width="3" marker-end="url(#push-arrow)"/>
            <text x="300" y="160" text-anchor="middle" fill="#00ff9d" font-family="JetBrains Mono" font-size="11">git push</text>
            
            <g transform="translate(400, 150)">
                <rect x="-60" y="-40" width="120" height="80" fill="#151932" stroke="#00aaff" stroke-width="2" rx="8"/>
                <text x="0" y="-15" text-anchor="middle" fill="#00aaff" font-family="JetBrains Mono" font-size="12">origin/main</text>
                <circle cx="-20" cy="10" r="6" fill="#00cc66"/>
                <circle cx="0" cy="10" r="6" fill="#00cc66"/>
                <circle cx="20" cy="10" r="6" fill="#00cc66"/>
            </g>
            
            <defs>
                <marker id="push-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="#00ff9d"/>
                </marker>
            </defs>
        `;
    }
}

// Initialize the visualizer when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new GitVisualizer();
});
