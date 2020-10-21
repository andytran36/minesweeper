"use strict";

let MSGame = (function(){

  // private constants
  const STATE_HIDDEN = "hidden";
  const STATE_SHOWN = "shown";
  const STATE_MARKED = "marked";

  function array2d( nrows, ncols, val) {
    const res = [];
    for( let row = 0 ; row < nrows ; row ++) {
      res[row] = [];
      for( let col = 0 ; col < ncols ; col ++)
        res[row][col] = val(row,col);
    }
    return res;
  }

  // returns random integer in range [min, max]
  function rndInt(min, max) {
    [min,max] = [Math.ceil(min), Math.floor(max)]
    return min + Math.floor(Math.random() * (max - min + 1));
  }

  class _MSGame {
    constructor() {
      this.init(8,10,10); // easy
    }

    validCoord(row, col) {
      return row >= 0 && row < this.nrows && col >= 0 && col < this.ncols;
    }

    init(nrows, ncols, nmines) {
      this.nrows = nrows;
      this.ncols = ncols;
      this.nmines = nmines;
      this.nmarked = 0;
      this.nuncovered = 0;
      this.exploded = false;
      // create an array
      this.arr = array2d(
        nrows, ncols,
        () => ({mine: false, state: STATE_HIDDEN, count: 0}));
    }

    count(row,col) {
      const c = (r,c) =>
            (this.validCoord(r,c) && this.arr[r][c].mine ? 1 : 0);
      let res = 0;
      for( let dr = -1 ; dr <= 1 ; dr ++ )
        for( let dc = -1 ; dc <= 1 ; dc ++ )
          res += c(row+dr,col+dc);
      return res;
    }

    sprinkleMines(row, col) {
        // prepare a list of allowed coordinates for mine placement
      let allowed = [];
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(Math.abs(row-r) > 2 || Math.abs(col-c) > 2)
            allowed.push([r,c]);
        }
      }
      this.nmines = Math.min(this.nmines, allowed.length);
      for( let i = 0 ; i < this.nmines ; i ++ ) {
        let j = rndInt(i, allowed.length-1);
        [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        let [r,c] = allowed[i];
        this.arr[r][c].mine = true;
      }
      // erase any marks (in case user placed them) and update counts
      for(let r = 0 ; r < this.nrows ; r ++ ) {
        for( let c = 0 ; c < this.ncols ; c ++ ) {
          if(this.arr[r][c].state == STATE_MARKED)
            this.arr[r][c].state = STATE_HIDDEN;
          this.arr[r][c].count = this.count(r,c);
        }
      }
      let mines = []; let counts = [];
      for(let row = 0 ; row < this.nrows ; row ++ ) {
        let s = "";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].mine ? "B" : ".";
        }
        s += "  |  ";
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          s += this.arr[row][col].count.toString();
        }
        mines[row] = s;
      }
      console.log("Mines and counts after sprinkling:");
      console.log(mines.join("\n"), "\n");
    }

    // uncovers a cell at a given coordinate
    // this is the 'left-click' functionality
    uncover(row, col) {
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if this is the very first move, populate the mines, but make
      // sure the current cell does not get a mine
      if( this.nuncovered === 0)
        this.sprinkleMines(row, col);
      // if cell is not hidden, ignore this move
      if( this.arr[row][col].state !== STATE_HIDDEN) return false;
      // floodfill all 0-count cells
      const ff = (r,c) => {
        if( ! this.validCoord(r,c)) return;
        if( this.arr[r][c].state !== STATE_HIDDEN) return;
        this.arr[r][c].state = STATE_SHOWN;
        this.nuncovered ++;
        if( this.arr[r][c].count !== 0) return;
        ff(r-1,c-1);ff(r-1,c);ff(r-1,c+1);
        ff(r  ,c-1);         ;ff(r  ,c+1);
        ff(r+1,c-1);ff(r+1,c);ff(r+1,c+1);
      };
      ff(row,col);
      // have we hit a mine?
      if( this.arr[row][col].mine) {
        this.exploded = true;
      }
      return true;
    }

    // puts a flag on a cell
    // this is the 'right-click' or 'long-tap' functionality
    mark(row, col) {
      console.log("mark", row, col);
      // if coordinates invalid, refuse this request
      if( ! this.validCoord(row,col)) return false;
      // if cell already uncovered, refuse this
      console.log("marking previous state=", this.arr[row][col].state);
      if( this.arr[row][col].state === STATE_SHOWN) return false;
      // accept the move and flip the marked status
      this.nmarked += this.arr[row][col].state == STATE_MARKED ? -1 : 1;
      this.arr[row][col].state = this.arr[row][col].state == STATE_MARKED ?
        STATE_HIDDEN : STATE_MARKED;
      return true;
    }

    // returns array of strings representing the rendering of the board
    //      "H" = hidden cell - no bomb
    //      "F" = hidden cell with a mark / flag
    //      "M" = uncovered mine (game should be over now)
    // '0'..'9' = number of mines in adjacent cells
    getRendering() {
      const res = [];
      for( let row = 0 ; row < this.nrows ; row ++) {
        let s = [];
        for( let col = 0 ; col < this.ncols ; col ++ ) {
          let a = this.arr[row][col];
          if( this.exploded && a.mine) s.push("M");
          else if( a.state === STATE_HIDDEN) s.push("H");
          else if( a.state === STATE_MARKED) s.push("F");
          else if( a.mine) s.push("M");
          else s.push(a.count.toString());
        }
        res[row] = s;
      }
      return res;
    }

    getStatus() {
      let done = this.exploded ||
          this.nuncovered === this.nrows * this.ncols - this.nmines;
      return {
        done: done,
        exploded: this.exploded,
        nrows: this.nrows,
        ncols: this.ncols,
        nmarked: this.nmarked,
        nuncovered: this.nuncovered,
        nmines: this.nmines
      }
    }
  }

  return _MSGame;
})();

/*******************************************************************

*******************************************************************/

window.addEventListener('load', main);

// set timeStart to current time
let timeStart = new Date().getTime();
const MAX_ROWS = 20;
const MAX_COLS = 24;

const difficultySettings = {
  'easy': {
    rows: 8,
    cols: 10,
    mines: 10
  },
  'medium': {
    rows: 14,
    cols: 18,
    mines: 40
  },
  'hard': {
    rows: 20,
    cols: 24,
    mines: 99
  }
}

function coordToIndex(x, y, cols) {
  return (x + y * cols);
}

function indexToCoord(index, cols) {
  return { 
    col: index % cols,
    row: Math.floor(index / cols),
  }
}

function render(board, state) {
  const grid = document.querySelector(".grid");
  grid.style.gridTemplateColumns = `repeat(${state.ncols}, 1fr)`;
  for( let i = 0 ; i < grid.children.length ; i ++) {
    const cell = grid.children[i];
    const ind = Number(cell.getAttribute("data-cellInd"));
    const {col, row} = indexToCoord(ind, MAX_COLS);
    if (row >= state.nrows) {
      cell.style.display = "none";
    } else if (col >= state.ncols) {
      cell.style.display = "none";
    } else {
      cell.style.display = "block";
      if (board[row][col] == "H") {
        cell.className = "cell covered";
        cell.setAttribute('data-before', "-");
      }
      else if (board[row][col] == "F") {
        cell.className = "cell flagged";
        cell.setAttribute('data-before', "F");
      }
      else if (board[row][col] == "M") {
        cell.className = "cell mine";
        cell.setAttribute('data-before', "M");
      }
      else {
        cell.className = "cell";
        cell.setAttribute('data-before', board[row][col]);
      }
    }
  }
  document.querySelector(".minesLeft").innerHTML = state.nmines - state.nmarked;
}

function reset() {
  const grid = document.querySelector(".grid");
  for( let i = 0 ; i < grid.children.length ; i ++) {
    const cell = grid.children[i];
    cell.className = "cell";
    cell.setAttribute('data-before', "-");
  }
  timeStart = new Date().getTime();
}

function prepare_dom(game) {
  const grid = document.querySelector(".grid");
  const maxCols = 24;
  const maxRows = 20;

  for (let i = 0; i < maxRows; i++) {
    for (let j = 0; j < maxCols; j++) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("data-cellInd", coordToIndex(j, i, maxCols));

      // Event Listener for left click
      cell.addEventListener("click", () => {
        game.uncover(i, j);
        const state = game.getStatus();
        if (state.done === true) {
          document.querySelector("#overlay").classList.toggle("active");
          document.querySelector(".overlay-title").innerHTML = state.exploded ? "Lose!" : "Win!";
          document.querySelector(".time-finish").innerHTML = document.querySelector(".timer").innerHTML;
        }
        render(game.getRendering(), state);
      });

      // Event listener for right click
      cell.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        game.mark(i, j);
        const state = game.getStatus();
        document.querySelector(".minesLeft").innerHTML = state.nmines - state.nmarked;
        render(game.getRendering(), state);
      });

      grid.appendChild(cell);

      // Event listener for taphold
      $(cell).on("taphold", function(event) {
        console.log("longpress");
        game.mark(i, j);
        const state = game.getStatus();
        document.querySelector(".minesLeft").innerHTML = state.nmines - state.nmarked;
        render(game.getRendering(), state);
      });
    }
  }
}

function main() {
  let game = new MSGame();

  // Set all menu buttons
  document.querySelectorAll(".difficultyButton").forEach((button) =>{
    let difficulty = button.getAttribute("difficulty");
    button.innerHTML = `${difficulty}`;
    const { rows, cols, mines } = difficultySettings[difficulty];
    button.addEventListener("click", () => {
      reset();
      game.init(rows, cols, mines);
      render(game.getRendering(), game.getStatus());
      document.querySelector(".minesLeft").innerHTML = mines;
    });
  });

  // set timer
  var x = setInterval(function() {
    let timeNow = new Date().getTime();
    document.querySelector(".timer").innerHTML = Math.floor((timeNow - timeStart) / 1000);
  }, 1000);

  prepare_dom(game);
  reset();
  game.init(8, 10, 10);
  render(game.getRendering(), game.getStatus());

  document.querySelector("#overlay").addEventListener("click", () => {
    document.querySelector("#overlay").classList.remove("active");
    const state = game.getStatus();
    game.init(state.nrows, state.ncols, state.nmines);
    reset();
    render(game.getRendering(), game.getStatus());
  });
}