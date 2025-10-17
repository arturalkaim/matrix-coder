// Matrix Coder - Game Engine
class MatrixCoder {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.programArea = document.getElementById('programArea');
        this.functionArea = document.getElementById('functionArea');
        this.console = document.getElementById('console');

        // Game state
        this.gridSize = 10;
        this.cellSize = 40;
        this.player = null;
        this.goal = null;
        this.obstacles = [];
        this.currentLevel = 0;
        this.isRunning = false;
        this.executionSpeed = 5;
        this.program = [];
        this.definedFunctions = {};

        // Memory Registers
        this.registers = {
            R1: 0,
            R2: 0,
            R3: 0,
            R4: 0
        };

        // Step Debugger
        this.debugMode = false;
        this.stepResolver = null;
        this.isPaused = false;

        // Level data
        this.levels = [];
        this.levelsLoaded = false;

        // Drag state
        this.draggedElement = null;
        this.draggedData = null;

        // Initialize
        this.init();
    }

    async init() {
        this.setupCanvas();
        this.setupDragAndDrop();
        this.setupControls();
        await this.loadLevelsData();
        this.loadLevel(1);
        this.render();
    }

    async loadLevelsData() {
        try {
            const response = await fetch('levels.json');
            const data = await response.json();
            this.levels = data.levels;
            this.levelsLoaded = true;
            this.populateLevelSelector();
            this.logToConsole('Level data loaded successfully', 'success');
        } catch (error) {
            this.logToConsole('Failed to load level data: ' + error.message, 'error');
            // Fallback to hardcoded levels
            this.levels = this.getHardcodedLevels();
            this.populateLevelSelector();
        }
    }

    populateLevelSelector() {
        const selector = document.getElementById('levelSelector');
        selector.innerHTML = '';

        this.levels.forEach(level => {
            const option = document.createElement('option');
            option.value = level.id;
            option.textContent = `${String(level.id).padStart(2, '0')} - ${level.name}`;
            selector.appendChild(option);
        });

        // Add change event listener
        selector.addEventListener('change', (e) => {
            const levelId = parseInt(e.target.value);
            this.loadLevel(levelId, false); // Don't clear program
        });
    }

    getHardcodedLevels() {
        // Fallback levels in case JSON fails to load
        return [
            {
                id: 1,
                name: 'AWAKENING',
                gridSize: 10,
                player: { x: 1, y: 1, direction: 0 },
                goal: { x: 8, y: 8 },
                obstacles: [
                    { x: 3, y: 1 }, { x: 3, y: 2 }, { x: 3, y: 3 },
                    { x: 6, y: 5 }, { x: 6, y: 6 }, { x: 6, y: 7 },
                ]
            }
        ];
    }

    setupCanvas() {
        this.canvas.width = this.gridSize * this.cellSize;
        this.canvas.height = this.gridSize * this.cellSize;
    }

    setupDragAndDrop() {
        // Make instruction blocks draggable
        document.querySelectorAll('.instruction-block').forEach(block => {
            block.addEventListener('dragstart', this.handleDragStart.bind(this));
            block.addEventListener('dragend', this.handleDragEnd.bind(this));
        });

        // Setup main program drop zone
        this.programArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.programArea.addEventListener('drop', this.handleDrop.bind(this));
        this.programArea.addEventListener('dragleave', this.handleDragLeave.bind(this));

        // Setup function definition drop zone
        this.functionArea.addEventListener('dragover', this.handleDragOver.bind(this));
        this.functionArea.addEventListener('drop', this.handleDrop.bind(this));
        this.functionArea.addEventListener('dragleave', this.handleDragLeave.bind(this));

        // Clear program button
        document.getElementById('clearProgram').addEventListener('click', () => {
            this.clearProgram();
        });

        // Clear functions button
        document.getElementById('clearFunctions').addEventListener('click', () => {
            this.clearFunctions();
        });
    }

    setupControls() {
        // Run button
        document.getElementById('runBtn').addEventListener('click', () => {
            this.debugMode = false;
            this.runProgram();
        });

        // Step button - run in debug mode
        document.getElementById('stepBtn').addEventListener('click', () => {
            if (!this.isRunning) {
                this.debugMode = true;
                this.runProgram();
            } else if (this.isPaused && this.stepResolver) {
                // Continue to next step
                this.stepResolver();
                this.stepResolver = null;
            }
        });

        // Continue button - continue execution without stopping
        document.getElementById('continueBtn').addEventListener('click', () => {
            if (this.isPaused && this.stepResolver) {
                this.debugMode = false;
                this.isPaused = false;
                this.stepResolver();
                this.stepResolver = null;
                document.getElementById('stepBtn').style.display = '';
                document.getElementById('continueBtn').style.display = 'none';
            }
        });

        // Reset button
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.resetLevel();
            this.debugMode = false;
            this.isPaused = false;
            if (this.stepResolver) {
                this.stepResolver();
                this.stepResolver = null;
            }
            document.getElementById('stepBtn').style.display = '';
            document.getElementById('continueBtn').style.display = 'none';
        });

        // Clear button
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearProgram();
        });

        // Speed slider
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        speedSlider.addEventListener('input', (e) => {
            this.executionSpeed = parseInt(e.target.value);
            speedValue.textContent = e.target.value;
        });

        // Export button
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportProgram();
        });

        // Import button
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        // Import file input
        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importProgram(file);
                e.target.value = ''; // Reset file input
            }
        });
    }

    // Drag and Drop handlers
    handleDragStart(e) {
        const block = e.target.closest('.instruction-block');
        if (!block) return;

        block.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';

        const instruction = {
            type: block.dataset.instruction,
            text: block.querySelector('.block-text').textContent,
            icon: block.querySelector('.block-icon').textContent,
            isStructure: block.dataset.structure === 'true'
        };

        // Handle blocks with inputs
        if (instruction.type === 'repeat') {
            const input = block.querySelector('.block-input');
            instruction.value = input ? parseInt(input.value) : 3;
        } else if (instruction.type === 'function') {
            const input = block.querySelector('.function-name');
            instruction.functionName = input ? input.value : 'func1';
        } else if (instruction.type === 'call') {
            const input = block.querySelector('.function-call');
            instruction.functionName = input ? input.value : 'func1';
        } else if (instruction.type === 'set') {
            const registerSelect = block.querySelector('.register-select');
            const valueInput = block.querySelector('.number-input');
            instruction.register = registerSelect ? registerSelect.value : 'R1';
            instruction.value = valueInput ? parseInt(valueInput.value) : 0;
        } else if (instruction.type === 'increment' || instruction.type === 'decrement') {
            const registerSelect = block.querySelector('.register-select');
            instruction.register = registerSelect ? registerSelect.value : 'R1';
        } else if (instruction.type === 'registerEquals' || instruction.type === 'registerGreater') {
            const registerSelect = block.querySelector('.register-select');
            const valueInput = block.querySelector('.number-input');
            instruction.register = registerSelect ? registerSelect.value : 'R1';
            instruction.value = valueInput ? parseInt(valueInput.value) : 0;
        }

        e.dataTransfer.setData('instruction', JSON.stringify(instruction));
        this.draggedData = instruction;
    }

    handleDragEnd(e) {
        const block = e.target.closest('.instruction-block');
        if (block) {
            block.classList.remove('dragging');
        }
        this.draggedData = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';

        // Check if we're over a valid drop zone
        const dropZone = e.target.closest('.drop-zone, .body-slot-area, .condition-slot-filled');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }

    handleDragLeave(e) {
        const dropZone = e.target.closest('.drop-zone, .body-slot-area, .condition-slot-filled');
        if (dropZone && !dropZone.contains(e.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        const dropZone = e.target.closest('.drop-zone, .body-slot-area, .condition-slot-filled');
        if (!dropZone) return;

        dropZone.classList.remove('drag-over');

        const instructionData = e.dataTransfer.getData('instruction');
        if (!instructionData) return;

        const instruction = JSON.parse(instructionData);

        // Handle different drop zones
        if (dropZone.classList.contains('condition-slot-filled')) {
            // Only allow sensor blocks and register conditions in condition slots
            const conditionTypes = ['wallAhead', 'goalAhead', 'pathClear', 'true', 'false', 'randomBoolean', 'not', 'registerEquals', 'registerGreater'];
            if (conditionTypes.includes(instruction.type)) {
                this.addConditionToSlot(dropZone, instruction);
            } else {
                this.logToConsole('Only sensor blocks can be used as conditions', 'error');
            }
        } else if (dropZone.classList.contains('body-slot-area')) {
            // Add to control structure body - no function definitions allowed in bodies
            if (instruction.type === 'function') {
                this.logToConsole('Function definitions must go in FUNCTION_DEFINITIONS area', 'error');
            } else {
                this.addInstructionToBody(dropZone, instruction);
            }
        } else if (dropZone.classList.contains('function-zone')) {
            // Only allow function definitions in function zone
            if (instruction.type === 'function') {
                this.addInstructionToProgram(instruction, dropZone);
            } else {
                this.logToConsole('Only function definitions can go in FUNCTION_DEFINITIONS area', 'error');
            }
        } else if (dropZone.classList.contains('program-zone')) {
            // Don't allow function definitions in main program
            if (instruction.type === 'function') {
                this.logToConsole('Function definitions must go in FUNCTION_DEFINITIONS area above', 'error');
            } else {
                this.addInstructionToProgram(instruction, dropZone);
            }
        }
    }

    addConditionToSlot(slot, condition) {
        // Clear existing condition
        slot.innerHTML = '';

        // Add the condition block
        const conditionBlock = document.createElement('div');
        conditionBlock.className = 'condition-block';

        // Handle special condition blocks
        if (condition.type === 'not') {
            // NOT block can contain another sensor
            conditionBlock.innerHTML = `
                <span class="block-icon">${condition.icon}</span>
                <span class="block-text">${condition.text}</span>
                <div class="condition-slot-filled nested-condition">
                    <span class="slot-placeholder">drop sensor</span>
                </div>
                <button class="remove-btn" style="position: static; margin-left: 5px;">✕</button>
            `;

            // Setup nested condition slot
            const nestedSlot = conditionBlock.querySelector('.nested-condition');
            nestedSlot.addEventListener('dragover', this.handleDragOver.bind(this));
            nestedSlot.addEventListener('drop', this.handleDrop.bind(this));
            nestedSlot.addEventListener('dragleave', this.handleDragLeave.bind(this));
        } else if (condition.type === 'registerEquals' || condition.type === 'registerGreater') {
            const operator = condition.type === 'registerGreater' ? '>' : '=';
            conditionBlock.innerHTML = `
                <span class="block-icon">${condition.icon}</span>
                <select class="block-select register-select">
                    <option value="R1" ${condition.register === 'R1' ? 'selected' : ''}>R1</option>
                    <option value="R2" ${condition.register === 'R2' ? 'selected' : ''}>R2</option>
                    <option value="R3" ${condition.register === 'R3' ? 'selected' : ''}>R3</option>
                    <option value="R4" ${condition.register === 'R4' ? 'selected' : ''}>R4</option>
                </select>
                <span class="block-text">${operator}</span>
                <input type="number" class="block-input number-input" value="${condition.value || 0}" min="-99" max="99">
                <span class="block-text">?</span>
                <button class="remove-btn" style="position: static; margin-left: 5px;">✕</button>
            `;
        } else {
            // Simple sensor conditions
            conditionBlock.innerHTML = `
                <span class="block-icon">${condition.icon}</span>
                <span class="block-text">${condition.text}</span>
                <button class="remove-btn" style="position: static; margin-left: 5px;">✕</button>
            `;
        }

        conditionBlock.querySelector('.remove-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            slot.innerHTML = '<span class="slot-placeholder">drop sensor here</span>';
            slot.classList.remove('has-condition');
        });

        slot.appendChild(conditionBlock);
        slot.classList.add('has-condition');
    }

    addInstructionToBody(bodySlot, instruction) {
        const programBlock = this.createProgramBlock(instruction, true);
        bodySlot.appendChild(programBlock);
        bodySlot.classList.add('has-blocks');
    }

    createProgramBlock(instruction, isNested = false) {
        const programBlock = document.createElement('div');
        programBlock.className = 'program-block';

        if (instruction.isStructure) {
            // Create control structure block
            programBlock.classList.add('control-structure');

            if (instruction.type === 'repeat') {
                programBlock.innerHTML = `
                    <div class="control-header">
                        <span class="block-icon">${instruction.icon}</span>
                        <span class="block-text">${instruction.text}</span>
                        <input type="number" class="block-input" min="1" max="99" value="${instruction.value || 3}">
                        <span>times</span>
                        <button class="remove-btn">✕</button>
                    </div>
                    <div class="body-slot-area">
                        <span class="slot-placeholder">drop blocks here</span>
                    </div>
                `;
            } else if (instruction.type === 'function') {
                programBlock.innerHTML = `
                    <div class="control-header">
                        <span class="block-icon">${instruction.icon}</span>
                        <span class="block-text">${instruction.text}</span>
                        <input type="text" class="block-input function-name" placeholder="name" maxlength="10" value="${instruction.functionName || 'func1'}">
                        <button class="remove-btn">✕</button>
                    </div>
                    <div class="body-slot-area">
                        <span class="slot-placeholder">drop function body here</span>
                    </div>
                `;
            } else if (instruction.type === 'if' || instruction.type === 'while') {
                programBlock.innerHTML = `
                    <div class="control-header">
                        <span class="block-icon">${instruction.icon}</span>
                        <span class="block-text">${instruction.text}</span>
                        <button class="remove-btn">✕</button>
                    </div>
                    <div class="condition-slot-filled">
                        <span class="slot-placeholder">drop sensor here</span>
                    </div>
                    <div class="body-slot-area">
                        <span class="slot-placeholder">drop blocks here</span>
                    </div>
                `;

                // Setup condition slot for drag and drop
                const conditionSlot = programBlock.querySelector('.condition-slot-filled');
                conditionSlot.addEventListener('dragover', this.handleDragOver.bind(this));
                conditionSlot.addEventListener('drop', this.handleDrop.bind(this));
                conditionSlot.addEventListener('dragleave', this.handleDragLeave.bind(this));
            } else if (instruction.type === 'ifElse') {
                programBlock.innerHTML = `
                    <div class="control-header">
                        <span class="block-icon">${instruction.icon}</span>
                        <span class="block-text">${instruction.text}</span>
                        <button class="remove-btn">✕</button>
                    </div>
                    <div class="condition-slot-filled">
                        <span class="slot-placeholder">drop sensor here</span>
                    </div>
                    <div class="body-slot-area if-body">
                        <div class="body-label">THEN:</div>
                        <span class="slot-placeholder">drop IF blocks here</span>
                    </div>
                    <div class="body-slot-area else-body">
                        <div class="body-label">ELSE:</div>
                        <span class="slot-placeholder">drop ELSE blocks here</span>
                    </div>
                `;

                // Setup condition slot for drag and drop
                const conditionSlot = programBlock.querySelector('.condition-slot-filled');
                conditionSlot.addEventListener('dragover', this.handleDragOver.bind(this));
                conditionSlot.addEventListener('drop', this.handleDrop.bind(this));
                conditionSlot.addEventListener('dragleave', this.handleDragLeave.bind(this));

                // Setup both body slots
                programBlock.querySelectorAll('.body-slot-area').forEach(bodySlot => {
                    bodySlot.addEventListener('dragover', this.handleDragOver.bind(this));
                    bodySlot.addEventListener('drop', this.handleDrop.bind(this));
                    bodySlot.addEventListener('dragleave', this.handleDragLeave.bind(this));
                });
            } else if (instruction.type === 'not') {
                // NOT is a special sensor block that contains another sensor
                programBlock.innerHTML = `
                    <div class="control-header">
                        <span class="block-icon">${instruction.icon}</span>
                        <span class="block-text">${instruction.text}</span>
                        <button class="remove-btn">✕</button>
                    </div>
                    <div class="condition-slot-filled not-slot">
                        <span class="slot-placeholder">drop sensor to negate</span>
                    </div>
                `;

                // Setup condition slot for drag and drop
                const conditionSlot = programBlock.querySelector('.condition-slot-filled');
                conditionSlot.addEventListener('dragover', this.handleDragOver.bind(this));
                conditionSlot.addEventListener('drop', this.handleDrop.bind(this));
                conditionSlot.addEventListener('dragleave', this.handleDragLeave.bind(this));
            }

            // Setup body slot for drag and drop (if not already handled)
            if (instruction.type !== 'ifElse' && instruction.type !== 'not') {
                const bodySlot = programBlock.querySelector('.body-slot-area');
                if (bodySlot) {
                    bodySlot.addEventListener('dragover', this.handleDragOver.bind(this));
                    bodySlot.addEventListener('drop', this.handleDrop.bind(this));
                    bodySlot.addEventListener('dragleave', this.handleDragLeave.bind(this));
                }
            }
        } else {
            // Create simple instruction block
            if (instruction.type === 'call') {
                programBlock.innerHTML = `
                    <span class="block-icon">${instruction.icon}</span>
                    <span class="block-text">${instruction.text}</span>
                    <input type="text" class="block-input function-call" placeholder="name" maxlength="10" value="${instruction.functionName || 'func1'}">
                    <button class="remove-btn">✕</button>
                `;
            } else if (instruction.type === 'set') {
                programBlock.innerHTML = `
                    <span class="block-icon">${instruction.icon}</span>
                    <span class="block-text">SET</span>
                    <select class="block-select register-select">
                        <option value="R1" ${instruction.register === 'R1' ? 'selected' : ''}>R1</option>
                        <option value="R2" ${instruction.register === 'R2' ? 'selected' : ''}>R2</option>
                        <option value="R3" ${instruction.register === 'R3' ? 'selected' : ''}>R3</option>
                        <option value="R4" ${instruction.register === 'R4' ? 'selected' : ''}>R4</option>
                    </select>
                    <span class="block-text">TO</span>
                    <input type="number" class="block-input number-input" value="${instruction.value || 0}" min="-99" max="99">
                    <button class="remove-btn">✕</button>
                `;
            } else if (instruction.type === 'increment' || instruction.type === 'decrement') {
                programBlock.innerHTML = `
                    <span class="block-icon">${instruction.icon}</span>
                    <span class="block-text">${instruction.text}</span>
                    <select class="block-select register-select">
                        <option value="R1" ${instruction.register === 'R1' ? 'selected' : ''}>R1</option>
                        <option value="R2" ${instruction.register === 'R2' ? 'selected' : ''}>R2</option>
                        <option value="R3" ${instruction.register === 'R3' ? 'selected' : ''}>R3</option>
                        <option value="R4" ${instruction.register === 'R4' ? 'selected' : ''}>R4</option>
                    </select>
                    <button class="remove-btn">✕</button>
                `;
            } else {
                programBlock.innerHTML = `
                    <span class="block-icon">${instruction.icon}</span>
                    <span class="block-text">${instruction.text}</span>
                    <button class="remove-btn">✕</button>
                `;
            }
        }

        // Add remove functionality
        const removeBtn = programBlock.querySelector('.remove-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const parentZone = programBlock.closest('.drop-zone');
                programBlock.remove();
                this.checkIfEmpty(parentZone);
            });
        }

        // Store instruction data
        programBlock.dataset.instruction = instruction.type;
        programBlock.dataset.isStructure = instruction.isStructure;

        return programBlock;
    }

    addInstructionToProgram(instruction, dropZone = null) {
        const targetZone = dropZone || this.programArea;
        const programBlock = this.createProgramBlock(instruction);

        targetZone.appendChild(programBlock);
        targetZone.classList.add('has-blocks');

        // Hide placeholder if exists
        const placeholder = targetZone.querySelector('.drop-zone-placeholder, .slot-placeholder');
        if (placeholder && targetZone.children.length > 1) {
            placeholder.style.display = 'none';
        }

        // Auto-scroll to show the newly added block
        if (targetZone === this.programArea) {
            this.programArea.scrollTop = this.programArea.scrollHeight;
        } else if (targetZone === this.functionArea) {
            this.functionArea.scrollTop = this.functionArea.scrollHeight;
        }
    }

    checkIfEmpty(targetZone = null) {
        // Check program area
        if (!targetZone || targetZone === this.programArea) {
            const blocks = this.programArea.querySelectorAll('.program-block');
            if (blocks.length === 0) {
                this.programArea.classList.remove('has-blocks');
                const placeholder = this.programArea.querySelector('.drop-zone-placeholder');
                if (placeholder) placeholder.style.display = '';
            }
        }

        // Check function area
        if (!targetZone || targetZone === this.functionArea) {
            const blocks = this.functionArea.querySelectorAll('.program-block');
            if (blocks.length === 0) {
                this.functionArea.classList.remove('has-blocks');
                const placeholder = this.functionArea.querySelector('.drop-zone-placeholder');
                if (placeholder) placeholder.style.display = '';
            }
        }
    }

    clearProgram() {
        this.programArea.innerHTML = `
            <div class="drop-zone-placeholder">
                <span class="placeholder-icon">⇩</span>
                <span class="placeholder-text">DRAG MAIN PROGRAM HERE</span>
            </div>
        `;
        this.programArea.classList.remove('has-blocks');
        this.program = [];
        this.logToConsole('Program cleared', 'info');
    }

    clearFunctions() {
        this.functionArea.innerHTML = `
            <div class="drop-zone-placeholder">
                <span class="placeholder-icon">ƒ</span>
                <span class="placeholder-text">DRAG FUNCTION BLOCKS HERE</span>
            </div>
        `;
        this.functionArea.classList.remove('has-blocks');
        this.definedFunctions = {};
        this.logToConsole('Functions cleared', 'info');
    }

    // Parse program from DOM
    parseProgram() {
        const blocks = this.programArea.querySelectorAll(':scope > .program-block');
        return Array.from(blocks).map(block => this.parseBlock(block));
    }

    parseBlock(block) {
        const instruction = {
            type: block.dataset.instruction,
            element: block
        };

        if (block.dataset.isStructure === 'true') {
            // Parse control structure
            if (instruction.type === 'repeat') {
                const input = block.querySelector('.block-input');
                instruction.count = input ? parseInt(input.value) : 3;
                instruction.body = this.parseBodySlot(block.querySelector('.body-slot-area'));
            } else if (instruction.type === 'if' || instruction.type === 'while') {
                instruction.condition = this.parseCondition(block.querySelector('.condition-slot-filled'));
                instruction.body = this.parseBodySlot(block.querySelector('.body-slot-area'));
            } else if (instruction.type === 'ifElse') {
                instruction.condition = this.parseCondition(block.querySelector('.condition-slot-filled'));
                instruction.ifBody = this.parseBodySlot(block.querySelector('.if-body'));
                instruction.elseBody = this.parseBodySlot(block.querySelector('.else-body'));
            } else if (instruction.type === 'not') {
                instruction.condition = this.parseCondition(block.querySelector('.condition-slot-filled'));
            } else if (instruction.type === 'function') {
                const input = block.querySelector('.function-name');
                instruction.functionName = input ? input.value : 'func1';
                instruction.body = this.parseBodySlot(block.querySelector('.body-slot-area'));
            }
        } else if (instruction.type === 'call') {
            const input = block.querySelector('.function-call');
            instruction.functionName = input ? input.value : 'func1';
        } else if (instruction.type === 'set') {
            const registerSelect = block.querySelector('.register-select');
            const valueInput = block.querySelector('.number-input');
            instruction.register = registerSelect ? registerSelect.value : 'R1';
            instruction.value = valueInput ? parseInt(valueInput.value) : 0;
        } else if (instruction.type === 'increment' || instruction.type === 'decrement') {
            const registerSelect = block.querySelector('.register-select');
            instruction.register = registerSelect ? registerSelect.value : 'R1';
        }

        return instruction;
    }

    parseCondition(conditionSlot) {
        if (!conditionSlot || !conditionSlot.querySelector('.condition-block')) {
            return null;
        }

        const conditionBlock = conditionSlot.querySelector('.condition-block');

        // Check if it's a NOT block
        const textElement = conditionBlock.querySelector('.block-text');
        if (textElement && textElement.textContent === 'NOT') {
            const nestedCondition = conditionBlock.querySelector('.nested-condition');
            return {
                type: 'not',
                condition: this.parseCondition(nestedCondition)
            };
        }

        // Check if it's a register condition
        const registerSelect = conditionSlot.querySelector('.register-select');
        if (registerSelect) {
            const valueInput = conditionSlot.querySelector('.number-input');
            const hasGreaterSign = conditionSlot.textContent.includes('>');
            return {
                type: hasGreaterSign ? 'registerGreater' : 'registerEquals',
                register: registerSelect.value,
                value: valueInput ? parseInt(valueInput.value) : 0
            };
        }

        // Otherwise it's a simple sensor
        const text = conditionSlot.querySelector('.block-text')?.textContent;
        const mapping = {
            'WALL_AHEAD?': 'wallAhead',
            'GOAL_AHEAD?': 'goalAhead',
            'PATH_CLEAR?': 'pathClear',
            'TRUE': 'true',
            'FALSE': 'false',
            'RANDOM?': 'randomBoolean',
            'NOT': 'not'
        };
        return mapping[text] || null;
    }

    parseBodySlot(bodySlot) {
        if (!bodySlot) return [];
        const blocks = bodySlot.querySelectorAll(':scope > .program-block');
        return Array.from(blocks).map(block => this.parseBlock(block));
    }

    // Export/Import functionality
    exportProgram() {
        // Parse current program and functions
        const functionBlocks = this.functionArea.querySelectorAll(':scope > .program-block');
        const functions = [];

        for (const block of functionBlocks) {
            const instruction = this.parseBlock(block);
            if (instruction.type === 'function') {
                functions.push(this.serializeInstruction(instruction));
            }
        }

        const mainProgram = this.parseProgram().map(inst => this.serializeInstruction(inst));

        const exportData = {
            version: '1.0',
            level: this.currentLevel,
            levelName: this.levels.find(l => l.id === this.currentLevel)?.name || 'Unknown',
            functions: functions,
            mainProgram: mainProgram,
            exportDate: new Date().toISOString()
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', `matrix-coder-level${this.currentLevel}-${Date.now()}.json`);
        linkElement.click();

        this.logToConsole('Program exported successfully', 'success');
    }

    serializeInstruction(instruction) {
        // Remove the DOM element reference for serialization
        const serialized = {
            type: instruction.type
        };

        if (instruction.count !== undefined) serialized.count = instruction.count;
        if (instruction.functionName !== undefined) serialized.functionName = instruction.functionName;
        if (instruction.register !== undefined) serialized.register = instruction.register;
        if (instruction.value !== undefined) serialized.value = instruction.value;
        if (instruction.condition !== undefined) {
            serialized.condition = this.serializeCondition(instruction.condition);
        }
        if (instruction.body !== undefined) {
            serialized.body = instruction.body.map(inst => this.serializeInstruction(inst));
        }
        if (instruction.ifBody !== undefined) {
            serialized.ifBody = instruction.ifBody.map(inst => this.serializeInstruction(inst));
        }
        if (instruction.elseBody !== undefined) {
            serialized.elseBody = instruction.elseBody.map(inst => this.serializeInstruction(inst));
        }

        return serialized;
    }

    serializeCondition(condition) {
        if (!condition) return null;
        if (typeof condition === 'string') return condition;

        // For complex conditions (objects)
        const serialized = {
            type: condition.type
        };

        if (condition.register !== undefined) serialized.register = condition.register;
        if (condition.value !== undefined) serialized.value = condition.value;
        if (condition.condition !== undefined) {
            serialized.condition = this.serializeCondition(condition.condition);
        }

        return serialized;
    }

    async importProgram(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            // Validate version
            if (!data.version || data.version !== '1.0') {
                throw new Error('Unsupported file version');
            }

            // Clear existing program
            this.clearProgram();
            this.clearFunctions();

            // Reconstruct functions
            if (data.functions && Array.isArray(data.functions)) {
                for (const funcData of data.functions) {
                    this.reconstructInstruction(funcData, this.functionArea);
                }
            }

            // Reconstruct main program
            if (data.mainProgram && Array.isArray(data.mainProgram)) {
                for (const instData of data.mainProgram) {
                    this.reconstructInstruction(instData, this.programArea);
                }
            }

            this.logToConsole(`Program imported successfully from level ${data.level}: ${data.levelName}`, 'success');
            this.logToConsole(`Originally exported on ${new Date(data.exportDate).toLocaleString()}`, 'info');
        } catch (error) {
            this.logToConsole(`Import failed: ${error.message}`, 'error');
        }
    }

    reconstructInstruction(instData, targetZone) {
        const instruction = this.createInstructionFromData(instData);
        const programBlock = this.createProgramBlock(instruction);

        targetZone.appendChild(programBlock);
        targetZone.classList.add('has-blocks');

        // Hide placeholder
        const placeholder = targetZone.querySelector('.drop-zone-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        // Reconstruct nested blocks
        if (instData.condition) {
            const conditionSlot = programBlock.querySelector('.condition-slot-filled');
            if (conditionSlot) {
                this.reconstructCondition(instData.condition, conditionSlot);
            }
        }

        if (instData.body) {
            const bodySlot = programBlock.querySelector('.body-slot-area:not(.if-body):not(.else-body)');
            if (bodySlot) {
                this.reconstructBody(instData.body, bodySlot);
            }
        }

        if (instData.ifBody) {
            const ifBodySlot = programBlock.querySelector('.if-body');
            if (ifBodySlot) {
                this.reconstructBody(instData.ifBody, ifBodySlot);
            }
        }

        if (instData.elseBody) {
            const elseBodySlot = programBlock.querySelector('.else-body');
            if (elseBodySlot) {
                this.reconstructBody(instData.elseBody, elseBodySlot);
            }
        }
    }

    createInstructionFromData(data) {
        const blockTypeInfo = this.getBlockTypeInfo(data.type);

        const instruction = {
            type: data.type,
            text: blockTypeInfo.text,
            icon: blockTypeInfo.icon,
            isStructure: blockTypeInfo.isStructure
        };

        // Copy relevant data fields
        if (data.count !== undefined) instruction.value = data.count; // For repeat blocks
        if (data.functionName !== undefined) instruction.functionName = data.functionName;
        if (data.register !== undefined) instruction.register = data.register;
        if (data.value !== undefined) instruction.value = data.value;

        return instruction;
    }

    getBlockTypeInfo(type) {
        const blockInfo = {
            'move': { text: 'MOVE', icon: '→', isStructure: false },
            'turnLeft': { text: 'TURN_LEFT', icon: '↺', isStructure: false },
            'turnRight': { text: 'TURN_RIGHT', icon: '↻', isStructure: false },
            'wallAhead': { text: 'WALL_AHEAD?', icon: '▓', isStructure: false },
            'goalAhead': { text: 'GOAL_AHEAD?', icon: '◎', isStructure: false },
            'pathClear': { text: 'PATH_CLEAR?', icon: '□', isStructure: false },
            'true': { text: 'TRUE', icon: '✓', isStructure: false },
            'false': { text: 'FALSE', icon: '✗', isStructure: false },
            'randomBoolean': { text: 'RANDOM?', icon: '🎲', isStructure: false },
            'not': { text: 'NOT', icon: '¬', isStructure: true },
            'if': { text: 'IF', icon: '?', isStructure: true },
            'ifElse': { text: 'IF-ELSE', icon: '⚡', isStructure: true },
            'while': { text: 'WHILE', icon: '∞', isStructure: true },
            'repeat': { text: 'REPEAT', icon: '×', isStructure: true },
            'function': { text: 'FUNCTION', icon: 'ƒ', isStructure: true },
            'call': { text: 'CALL', icon: '→ƒ', isStructure: false },
            'set': { text: 'SET', icon: '←', isStructure: false },
            'increment': { text: 'INCREMENT', icon: '+', isStructure: false },
            'decrement': { text: 'DECREMENT', icon: '−', isStructure: false },
            'registerEquals': { text: '=', icon: '=', isStructure: false },
            'registerGreater': { text: '>', icon: '>', isStructure: false }
        };

        return blockInfo[type] || { text: type.toUpperCase(), icon: '?', isStructure: false };
    }

    reconstructCondition(condData, conditionSlot) {
        if (!condData) return;

        if (typeof condData === 'string') {
            // Simple sensor condition
            const blockInfo = this.getBlockTypeInfo(condData);
            const condition = {
                type: condData,
                text: blockInfo.text,
                icon: blockInfo.icon
            };
            this.addConditionToSlot(conditionSlot, condition);
        } else if (typeof condData === 'object') {
            // Complex condition
            const blockInfo = this.getBlockTypeInfo(condData.type);
            const condition = {
                type: condData.type,
                text: blockInfo.text,
                icon: blockInfo.icon
            };

            if (condData.register !== undefined) condition.register = condData.register;
            if (condData.value !== undefined) condition.value = condData.value;

            this.addConditionToSlot(conditionSlot, condition);

            // Handle nested NOT condition
            if (condData.type === 'not' && condData.condition) {
                const nestedSlot = conditionSlot.querySelector('.nested-condition');
                if (nestedSlot) {
                    this.reconstructCondition(condData.condition, nestedSlot);
                }
            }
        }
    }

    reconstructBody(bodyData, bodySlot) {
        if (!bodyData || !Array.isArray(bodyData)) return;

        for (const instData of bodyData) {
            const instruction = this.createInstructionFromData(instData);
            const programBlock = this.createProgramBlock(instruction, true);

            bodySlot.appendChild(programBlock);
            bodySlot.classList.add('has-blocks');

            // Recursively reconstruct nested structures
            if (instData.condition) {
                const conditionSlot = programBlock.querySelector('.condition-slot-filled');
                if (conditionSlot) {
                    this.reconstructCondition(instData.condition, conditionSlot);
                }
            }

            if (instData.body) {
                const nestedBodySlot = programBlock.querySelector('.body-slot-area:not(.if-body):not(.else-body)');
                if (nestedBodySlot) {
                    this.reconstructBody(instData.body, nestedBodySlot);
                }
            }

            if (instData.ifBody) {
                const ifBodySlot = programBlock.querySelector('.if-body');
                if (ifBodySlot) {
                    this.reconstructBody(instData.ifBody, ifBodySlot);
                }
            }

            if (instData.elseBody) {
                const elseBodySlot = programBlock.querySelector('.else-body');
                if (elseBodySlot) {
                    this.reconstructBody(instData.elseBody, elseBodySlot);
                }
            }
        }
    }

    // Game execution
    async runProgram() {
        if (this.isRunning) return;

        // Parse functions from function area
        const functionBlocks = this.functionArea.querySelectorAll(':scope > .program-block');
        this.definedFunctions = {};

        for (const block of functionBlocks) {
            const instruction = this.parseBlock(block);
            if (instruction.type === 'function') {
                const name = instruction.functionName || 'func1';
                this.definedFunctions[name] = instruction.body || [];
                this.logToConsole(`Function '${name}' defined`, 'info');
            }
        }

        // Parse main program from program area
        this.program = this.parseProgram();
        if (this.program.length === 0 && Object.keys(this.definedFunctions).length === 0) {
            this.logToConsole('ERROR: No instructions to execute', 'error');
            return;
        }

        this.isRunning = true;
        this.logToConsole('EXECUTING PROGRAM...', 'success');
        document.getElementById('runBtn').disabled = true;

        try {
            await this.executeInstructions(this.program);

            if (this.checkWinCondition()) {
                this.logToConsole('SUCCESS! Level completed!', 'success');
                setTimeout(() => {
                    this.nextLevel();
                }, 2000);
            } else {
                this.logToConsole('Program ended. Goal not reached.', 'error');
            }
        } catch (error) {
            this.logToConsole(`ERROR: ${error.message}`, 'error');
        }

        this.isRunning = false;
        document.getElementById('runBtn').disabled = false;

        // Clear execution highlights
        document.querySelectorAll('.program-block').forEach(block => {
            block.classList.remove('executing');
        });
    }

    async executeInstructions(instructions) {
        for (const instruction of instructions) {
            if (!this.isRunning) break;
            await this.executeInstruction(instruction);
        }
    }

    async executeInstruction(instruction) {
        // Highlight current instruction
        if (instruction.element) {
            document.querySelectorAll('.program-block').forEach(b =>
                b.classList.remove('executing'));
            instruction.element.classList.add('executing');
        }

        // In debug mode, wait for user to step
        if (this.debugMode) {
            this.isPaused = true;
            document.getElementById('stepBtn').style.display = 'none';
            document.getElementById('continueBtn').style.display = '';

            this.logToConsole(`[DEBUG] Paused at: ${instruction.type}`, 'info');

            // Wait for user to click step or continue
            await new Promise(resolve => {
                this.stepResolver = resolve;
            });

            this.isPaused = false;

            // If still in debug mode, show step button again
            if (this.debugMode) {
                document.getElementById('stepBtn').style.display = '';
                document.getElementById('continueBtn').style.display = 'none';
            }
        } else {
            // Normal execution - use speed control
            await this.delay(500 / this.executionSpeed);
        }

        switch (instruction.type) {
            case 'move':
                this.movePlayer();
                break;
            case 'turnLeft':
                this.turnPlayer(-90);
                break;
            case 'turnRight':
                this.turnPlayer(90);
                break;
            case 'set':
                this.registers[instruction.register] = instruction.value;
                this.logToConsole(`  ${instruction.register} = ${instruction.value}`, 'info');
                this.updateRegisterDisplay();
                break;
            case 'increment':
                this.registers[instruction.register]++;
                this.logToConsole(`  ${instruction.register}++ (now ${this.registers[instruction.register]})`, 'info');
                this.updateRegisterDisplay();
                break;
            case 'decrement':
                this.registers[instruction.register]--;
                this.logToConsole(`  ${instruction.register}-- (now ${this.registers[instruction.register]})`, 'info');
                this.updateRegisterDisplay();
                break;
            case 'repeat':
                await this.executeRepeat(instruction);
                break;
            case 'if':
                await this.executeIf(instruction);
                break;
            case 'ifElse':
                await this.executeIfElse(instruction);
                break;
            case 'while':
                await this.executeWhile(instruction);
                break;
            case 'call':
                await this.executeCall(instruction);
                break;
            default:
                this.logToConsole(`Unknown instruction: ${instruction.type}`, 'error');
        }

        this.render();
    }

    async executeRepeat(instruction) {
        const count = instruction.count || 3;
        this.logToConsole(`Repeating ${count} times`, 'info');

        for (let i = 0; i < count; i++) {
            if (!this.isRunning) break;
            this.logToConsole(`  Iteration ${i + 1}/${count}`, 'info');
            await this.executeInstructions(instruction.body || []);
        }
    }

    async executeIf(instruction) {
        if (!instruction.condition) {
            this.logToConsole('IF block missing condition - skipping', 'error');
            return;
        }

        const conditionMet = this.evaluateCondition(instruction.condition);
        this.logToConsole(`IF ${JSON.stringify(instruction.condition)}: ${conditionMet}`, 'info');

        if (conditionMet) {
            await this.executeInstructions(instruction.body || []);
        }
    }

    async executeIfElse(instruction) {
        if (!instruction.condition) {
            this.logToConsole('IF-ELSE block missing condition - skipping', 'error');
            return;
        }

        const conditionMet = this.evaluateCondition(instruction.condition);
        this.logToConsole(`IF-ELSE ${JSON.stringify(instruction.condition)}: ${conditionMet}`, 'info');

        if (conditionMet) {
            this.logToConsole('  Executing THEN branch', 'info');
            await this.executeInstructions(instruction.ifBody || []);
        } else {
            this.logToConsole('  Executing ELSE branch', 'info');
            await this.executeInstructions(instruction.elseBody || []);
        }
    }

    async executeWhile(instruction) {
        if (!instruction.condition) {
            this.logToConsole('WHILE block missing condition - skipping (add sensor to avoid infinite loop)', 'error');
            return;
        }

        // Special warning for WHILE TRUE
        if (instruction.condition === 'true') {
            this.logToConsole('WHILE TRUE detected - will run until max iterations or program stops', 'info');
        }

        let iterations = 0;
        const maxIterations = 100; // Prevent infinite loops

        while (this.evaluateCondition(instruction.condition) && iterations < maxIterations) {
            if (!this.isRunning) break;
            this.logToConsole(`WHILE ${instruction.condition}: iteration ${iterations + 1}`, 'info');
            await this.executeInstructions(instruction.body || []);
            iterations++;
        }

        if (iterations >= maxIterations) {
            throw new Error('While loop exceeded maximum iterations (100)');
        }
    }

    async executeCall(instruction) {
        const functionName = instruction.functionName || 'func1';
        const functionBody = this.definedFunctions[functionName];

        if (!functionBody) {
            this.logToConsole(`ERROR: Function '${functionName}' not defined`, 'error');
            return;
        }

        this.logToConsole(`Calling function '${functionName}'`, 'info');
        await this.executeInstructions(functionBody);
        this.logToConsole(`Function '${functionName}' completed`, 'info');
    }

    evaluateCondition(condition) {
        if (!condition) return false;

        // Handle complex conditions (objects)
        if (typeof condition === 'object') {
            // Handle NOT condition
            if (condition.type === 'not') {
                const innerResult = this.evaluateCondition(condition.condition);
                const result = !innerResult;
                this.logToConsole(`  NOT ${JSON.stringify(condition.condition)}: ${result}`, 'info');
                return result;
            }

            // Handle register conditions
            const registerValue = this.registers[condition.register] || 0;
            if (condition.type === 'registerEquals') {
                return registerValue === condition.value;
            } else if (condition.type === 'registerGreater') {
                return registerValue > condition.value;
            }
            return false;
        }

        // Handle simple sensor conditions
        switch (condition) {
            case 'wallAhead':
                return this.isWallAhead();
            case 'goalAhead':
                return this.isGoalAhead();
            case 'pathClear':
                return !this.isWallAhead();
            case 'true':
                return true;
            case 'false':
                return false;
            case 'randomBoolean':
                const result = Math.random() < 0.5;
                this.logToConsole(`  RANDOM? returned ${result}`, 'info');
                return result;
            default:
                return false;
        }
    }

    isWallAhead() {
        const nextX = this.player.x + this.player.dx;
        const nextY = this.player.y + this.player.dy;
        return !this.isValidMove(nextX, nextY);
    }

    isGoalAhead() {
        const nextX = this.player.x + this.player.dx;
        const nextY = this.player.y + this.player.dy;
        return nextX === this.goal.x && nextY === this.goal.y;
    }

    movePlayer() {
        const newX = this.player.x + this.player.dx;
        const newY = this.player.y + this.player.dy;

        if (this.isValidMove(newX, newY)) {
            this.player.x = newX;
            this.player.y = newY;
            this.logToConsole(`  Moved to (${newX}, ${newY})`, 'info');
        } else {
            this.logToConsole(`  Cannot move - obstacle at (${newX}, ${newY})`, 'error');
            throw new Error('Collision detected!');
        }
    }

    turnPlayer(angle) {
        this.player.direction = (this.player.direction + angle + 360) % 360;

        // Update direction vectors
        switch (this.player.direction) {
            case 0: // Right
                this.player.dx = 1;
                this.player.dy = 0;
                break;
            case 90: // Down
                this.player.dx = 0;
                this.player.dy = 1;
                break;
            case 180: // Left
                this.player.dx = -1;
                this.player.dy = 0;
                break;
            case 270: // Up
                this.player.dx = 0;
                this.player.dy = -1;
                break;
        }

        this.logToConsole(`  Turned ${angle > 0 ? 'right' : 'left'}`, 'info');
    }

    isValidMove(x, y) {
        // Check boundaries
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) {
            return false;
        }

        // Check obstacles
        for (const obstacle of this.obstacles) {
            if (obstacle.x === x && obstacle.y === y) {
                return false;
            }
        }

        return true;
    }

    checkWinCondition() {
        return this.player.x === this.goal.x && this.player.y === this.goal.y;
    }

    // Level management
    loadLevel(levelNumber, clearProgram = true) {
        const level = this.levels.find(l => l.id === levelNumber) || this.levels[0];
        if (!level) {
            this.logToConsole(`Level ${levelNumber} not found`, 'error');
            return;
        }

        this.currentLevel = levelNumber;
        // Update selector if needed
        const selector = document.getElementById('levelSelector');
        if (selector && selector.value != levelNumber) {
            selector.value = levelNumber;
        }
        document.getElementById('levelName').textContent = `// ${level.name}`;

        this.gridSize = level.gridSize;
        this.cellSize = 400 / this.gridSize;
        this.setupCanvas();

        // Reset memory registers for new level
        this.registers = { R1: 0, R2: 0, R3: 0, R4: 0 };
        this.updateRegisterDisplay();

        this.player = {
            ...level.player,
            dx: 1,
            dy: 0
        };

        // Set initial direction vectors based on player direction
        switch (level.player.direction) {
            case 0: // Right
                this.player.dx = 1;
                this.player.dy = 0;
                break;
            case 90: // Down
                this.player.dx = 0;
                this.player.dy = 1;
                break;
            case 180: // Left
                this.player.dx = -1;
                this.player.dy = 0;
                break;
            case 270: // Up
                this.player.dx = 0;
                this.player.dy = -1;
                break;
        }

        this.goal = level.goal;
        this.obstacles = level.obstacles;

        this.logToConsole(`Level ${levelNumber}: ${level.name} loaded`, 'success');
        if (level.description) {
            this.logToConsole(`Objective: ${level.description}`, 'info');
        }
        if (level.hint) {
            this.logToConsole(`Hint: ${level.hint}`, 'info');
        }

        // Render the new level
        this.render();
    }

    updateRegisterDisplay() {
        // We'll implement this after adding the UI elements
        const display = document.getElementById('registerDisplay');
        if (display) {
            display.innerHTML = Object.entries(this.registers)
                .map(([reg, val]) => `<span class="register-item">${reg}: ${val}</span>`)
                .join(' ');
        }
    }

    resetLevel() {
        this.loadLevel(this.currentLevel, false); // Don't clear program on reset
        this.isRunning = false;
        document.getElementById('runBtn').disabled = false;

        // Clear execution highlights
        document.querySelectorAll('.program-block').forEach(block => {
            block.classList.remove('executing');
        });

        this.render();
        this.logToConsole('Level reset', 'info');
    }

    nextLevel() {
        if (this.currentLevel < this.levels.length) {
            this.loadLevel(this.currentLevel + 1, false); // Don't clear program
            this.render();
        } else {
            this.logToConsole('ALL LEVELS COMPLETED! You are THE ONE.', 'success');
        }
    }

    // Rendering
    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw grid
        this.drawGrid();

        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            this.drawObstacle(obstacle);
        });

        // Draw goal
        this.drawGoal();

        // Draw player
        this.drawPlayer();
    }

    drawGrid() {
        this.ctx.strokeStyle = '#00ff4120';
        this.ctx.lineWidth = 1;

        for (let i = 0; i <= this.gridSize; i++) {
            // Vertical lines
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();

            // Horizontal lines
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawObstacle(obstacle) {
        const x = obstacle.x * this.cellSize;
        const y = obstacle.y * this.cellSize;

        // Matrix-style obstacle
        this.ctx.fillStyle = '#00ff4140';
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        this.ctx.strokeStyle = '#00ff41';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 2, y + 2, this.cellSize - 4, this.cellSize - 4);

        // Draw matrix characters
        this.ctx.fillStyle = '#00ff41';
        this.ctx.font = '16px Share Tech Mono';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('▓', x + this.cellSize / 2, y + this.cellSize / 2);
    }

    drawGoal() {
        const x = this.goal.x * this.cellSize;
        const y = this.goal.y * this.cellSize;

        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.003) * 0.3 + 0.7;

        this.ctx.fillStyle = `rgba(0, 255, 65, ${pulse * 0.3})`;
        this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

        this.ctx.strokeStyle = `rgba(0, 255, 65, ${pulse})`;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x + 4, y + 4, this.cellSize - 8, this.cellSize - 8);

        // Draw target symbol
        this.ctx.beginPath();
        this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 3, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.arc(x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 6, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    drawPlayer() {
        const x = this.player.x * this.cellSize;
        const y = this.player.y * this.cellSize;
        const centerX = x + this.cellSize / 2;
        const centerY = y + this.cellSize / 2;

        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(this.player.direction * Math.PI / 180);

        // Draw player as a triangle pointing in direction
        this.ctx.fillStyle = '#00ff41';
        this.ctx.beginPath();
        this.ctx.moveTo(this.cellSize / 3, 0);
        this.ctx.lineTo(-this.cellSize / 4, -this.cellSize / 4);
        this.ctx.lineTo(-this.cellSize / 4, this.cellSize / 4);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = '#00ff41';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();

        // Draw glow effect
        this.ctx.shadowColor = '#00ff41';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#00ff4180';
        this.ctx.strokeRect(x + 8, y + 8, this.cellSize - 16, this.cellSize - 16);
        this.ctx.shadowBlur = 0;
    }

    // Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    logToConsole(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = type;
        entry.textContent = `> ${message}`;
        this.console.appendChild(entry);
        this.console.scrollTop = this.console.scrollHeight;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new MatrixCoder();

    // Add Matrix rain effect (optional)
    const matrixBg = document.querySelector('.matrix-bg');
    if (matrixBg) {
        // Simple Matrix rain effect
        setInterval(() => {
            const opacity = Math.random() * 0.1;
            matrixBg.style.opacity = opacity;
        }, 2000);
    }
});