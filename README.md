# Matrix Coder 🎮

![Matrix Coder](https://img.shields.io/badge/Version-1.0-green) ![License](https://img.shields.io/badge/License-MIT-blue) ![JavaScript](https://img.shields.io/badge/JavaScript-ES6-yellow) [![Play Now](https://img.shields.io/badge/Play-Live_Demo-brightgreen)](https://arturalkaim.github.io/matrix-coder/)

An educational web-based programming game that teaches fundamental coding concepts through visual block-based programming in a cyberpunk Matrix-themed environment.

**🎮 [Play it now at arturalkaim.github.io/matrix-coder](https://arturalkaim.github.io/matrix-coder/)**

## 🎯 Overview

Matrix Coder follows a "program-then-execute" model where players construct their entire program using visual blocks, press EXECUTE, and watch their character follow the instructions to navigate through grid-based puzzles.

## ✨ Features

- **Visual Programming**: Drag-and-drop code blocks - no syntax errors!
- **Progressive Learning**: 9 levels teaching core programming concepts
- **Programming Concepts**:
  - Sequential execution
  - Conditional logic (IF/IF-ELSE)
  - Loops (WHILE, REPEAT)
  - Functions and abstraction
  - Memory registers (variables)
  - Boolean logic (NOT, AND/OR through composition)
  - Random behavior
- **Step Debugger**: Watch your program execute instruction-by-instruction
- **Export/Import**: Save and share your solutions as JSON files
- **Matrix Theme**: Immersive cyberpunk aesthetic with green-on-black visuals

## 🚀 Getting Started

### Play Online
🎮 **[Play Matrix Coder Now!](https://arturalkaim.github.io/matrix-coder/)**

Or download and open `index.html` in a modern web browser. No installation required!

### Local Development
```bash
git clone https://github.com/arturalkaim/matrix-coder.git
cd matrix-coder
# Open index.html in your browser
```

## 🎮 How to Play

1. **Drag blocks** from the instruction palette to the program area
2. **Build your program** by combining movement, sensors, and control structures
3. **Press EXECUTE** to run your program
4. **Watch** as your character follows the instructions
5. **Reach the goal** (pulsing green target) to complete the level

### Instruction Categories

#### Movement Blocks (Green)
- `MOVE`: Advance one cell forward
- `TURN_LEFT`: Rotate 90° counterclockwise
- `TURN_RIGHT`: Rotate 90° clockwise

#### Sensor Blocks (Blue)
- `WALL_AHEAD?`: Check for obstacles
- `GOAL_AHEAD?`: Check if goal is ahead
- `PATH_CLEAR?`: Check if path is clear
- `TRUE`/`FALSE`: Constant values
- `RANDOM?`: Random true/false
- `NOT`: Negate a condition

#### Control Structures (Yellow)
- `IF`: Conditional execution
- `IF-ELSE`: Conditional branching
- `WHILE`: Loop while condition is true
- `REPEAT`: Fixed iteration loop

#### Memory Operations (Pink)
- `SET`: Assign value to register
- `INCREMENT`/`DECREMENT`: Modify register value
- Register conditions for comparisons

#### Functions (Purple)
- `FUNCTION`: Define reusable code blocks
- `CALL`: Execute defined functions

## 📚 Educational Value

Matrix Coder teaches:
- **Algorithmic thinking**: Breaking problems into steps
- **Debugging skills**: Understanding why programs fail
- **Abstraction**: Using functions to organize code
- **Logic**: Boolean operations and conditions
- **Iteration**: Different types of loops
- **Problem-solving**: Multiple solution approaches

## 🛠 Technical Details

- **Pure JavaScript**: No framework dependencies
- **HTML5 Canvas**: Smooth game rendering
- **Drag-and-Drop API**: Intuitive block manipulation
- **CSS3 Animations**: Hardware-accelerated effects
- **Responsive Design**: Works on various screen sizes

## 📁 Project Structure

```
matrix-coder/
├── index.html           # Main game interface
├── game.js             # Game engine and logic
├── style.css           # Matrix-themed styling
├── levels.json         # Level definitions
├── GAME_DESIGN_DOC.md  # Detailed game design
└── README.md           # This file
```

## 🎯 Level Progression

1. **AWAKENING**: Basic movement and navigation
2. **THE MAZE**: Using sensors and conditionals
3. **LOOP MASTER**: Efficient use of loops
4. **MEMORY TEST**: Working with registers
5. **CONDITIONAL COUNTING**: Complex register operations
6. **CHAOS WALKER**: Random behavior exploration
7. **PROBABILITY MAZE**: Strategic use of randomness
8. **DECISION TREE**: IF-ELSE and NOT logic
9. **INVERSE LOGIC**: Advanced boolean operations

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add new levels
- Improve the UI/UX
- Add new instruction blocks
- Enhance the visual effects
- Fix bugs or optimize performance

## 📝 License

This project is open source and available under the MIT License.

## 🙏 Acknowledgments

- Inspired by visual programming environments like Scratch and Blockly
- Matrix theme inspired by the iconic film franchise
- Built with assistance from Claude AI

## 🔗 Links

- 🎮 [Play Matrix Coder Live](https://arturalkaim.github.io/matrix-coder/)
- 💻 [GitHub Repository](https://github.com/arturalkaim/matrix-coder)
- 🐛 [Report Issues](https://github.com/arturalkaim/matrix-coder/issues)
- 📖 [Game Design Document](GAME_DESIGN_DOC.md)

---

*Welcome to the Matrix. Follow the white rabbit.* 🐇