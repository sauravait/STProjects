'use strict';

// ─── Constants ───────────────────────────────────────────────────────────────

const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

const INITIAL_BOARD = [
  ['bR','bN','bB','bQ','bK','bB','bN','bR'],
  ['bP','bP','bP','bP','bP','bP','bP','bP'],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ['wP','wP','wP','wP','wP','wP','wP','wP'],
  ['wR','wN','wB','wQ','wK','wB','wN','wR'],
];

// ─── State ────────────────────────────────────────────────────────────────────

let board = [];
let currentTurn = 'w';
let selectedCell = null;
let legalMoves = [];
let castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
let enPassantTarget = null; // [row, col] of the square that can be captured en passant
let moveHistory = [];
let gameOver = false;
let capturedByWhite = [];
let capturedByBlack = [];
let promotionPending = null; // { from, to }
let halfMoveClock = 0;
let fullMoveNumber = 1;

// ─── Board helpers ────────────────────────────────────────────────────────────

function cloneBoard(b) {
  return b.map(r => [...r]);
}

function color(piece) {
  return piece ? piece[0] : null;
}

function pieceType(piece) {
  return piece ? piece[1] : null;
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

// ─── Move generation ──────────────────────────────────────────────────────────

function getRawMoves(b, r, c, epTarget) {
  const piece = b[r][c];
  if (!piece) return [];
  const col = color(piece);
  const type = pieceType(piece);
  const moves = [];

  const addIfValid = (tr, tc) => {
    if (!inBounds(tr, tc)) return false;
    if (color(b[tr][tc]) === col) return false;
    moves.push([tr, tc]);
    return b[tr][tc] === null; // continue sliding if empty
  };

  const slide = (dr, dc) => {
    let tr = r + dr, tc = c + dc;
    while (inBounds(tr, tc)) {
      if (!addIfValid(tr, tc)) break;
      tr += dr; tc += dc;
    }
  };

  switch (type) {
    case 'P': {
      const dir = col === 'w' ? -1 : 1;
      const startRow = col === 'w' ? 6 : 1;
      // forward
      if (inBounds(r + dir, c) && !b[r + dir][c]) {
        moves.push([r + dir, c]);
        if (r === startRow && !b[r + 2 * dir][c])
          moves.push([r + 2 * dir, c]);
      }
      // captures
      for (const dc of [-1, 1]) {
        const tr = r + dir, tc = c + dc;
        if (inBounds(tr, tc)) {
          if (color(b[tr][tc]) !== null && color(b[tr][tc]) !== col)
            moves.push([tr, tc]);
          if (epTarget && tr === epTarget[0] && tc === epTarget[1])
            moves.push([tr, tc]);
        }
      }
      break;
    }
    case 'N': {
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])
        addIfValid(r + dr, c + dc);
      break;
    }
    case 'B': {
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc);
      break;
    }
    case 'R': {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
      break;
    }
    case 'Q': {
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
      break;
    }
    case 'K': {
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]])
        addIfValid(r + dr, c + dc);
      // castling handled separately in getLegalMoves
      break;
    }
  }
  return moves;
}

function isSquareAttacked(b, r, c, byColor) {
  for (let fr = 0; fr < 8; fr++)
    for (let fc = 0; fc < 8; fc++)
      if (color(b[fr][fc]) === byColor) {
        const moves = getRawMoves(b, fr, fc, null);
        if (moves.some(([mr, mc]) => mr === r && mc === c)) return true;
      }
  return false;
}

function isInCheck(b, col) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (b[r][c] === col + 'K') {
        const opp = col === 'w' ? 'b' : 'w';
        return isSquareAttacked(b, r, c, opp);
      }
  return false;
}

function getLegalMoves(b, r, c, cr, epTarget) {
  const piece = b[r][c];
  if (!piece) return [];
  const col = color(piece);
  const type = pieceType(piece);
  const opp = col === 'w' ? 'b' : 'w';
  const legal = [];

  const rawMoves = getRawMoves(b, r, c, epTarget);

  for (const [tr, tc] of rawMoves) {
    const nb = cloneBoard(b);
    // handle en passant capture
    if (type === 'P' && tc !== c && !b[tr][tc] && epTarget && tr === epTarget[0] && tc === epTarget[1]) {
      nb[r][tc] = null; // remove captured pawn
    }
    nb[tr][tc] = nb[r][c];
    nb[r][c] = null;
    if (!isInCheck(nb, col)) legal.push([tr, tc]);
  }

  // Castling
  if (type === 'K') {
    const kRow = col === 'w' ? 7 : 0;
    if (r === kRow && c === 4 && !isInCheck(b, col)) {
      // King-side
      if (cr[col + 'K'] && b[kRow][5] === null && b[kRow][6] === null &&
          !isSquareAttacked(b, kRow, 5, opp) && !isSquareAttacked(b, kRow, 6, opp))
        legal.push([kRow, 6]);
      // Queen-side
      if (cr[col + 'Q'] && b[kRow][3] === null && b[kRow][2] === null && b[kRow][1] === null &&
          !isSquareAttacked(b, kRow, 3, opp) && !isSquareAttacked(b, kRow, 2, opp))
        legal.push([kRow, 2]);
    }
  }

  return legal;
}

function getAllLegalMoves(b, col, cr, epTarget) {
  const all = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (color(b[r][c]) === col) {
        const moves = getLegalMoves(b, r, c, cr, epTarget);
        for (const m of moves) all.push({ from: [r, c], to: m });
      }
  return all;
}

// ─── Move execution ───────────────────────────────────────────────────────────

function applyMove(fromR, fromC, toR, toC, promoteTo) {
  const piece = board[fromR][fromC];
  const col = color(piece);
  const type = pieceType(piece);
  const captured = board[toR][toC];
  const notation = buildNotation(fromR, fromC, toR, toC, promoteTo, captured);

  // update half move clock
  if (type === 'P' || captured) halfMoveClock = 0;
  else halfMoveClock++;

  // capture
  if (captured) {
    if (col === 'w') capturedByWhite.push(captured);
    else capturedByBlack.push(captured);
  }

  // en passant capture
  let epCapture = false;
  if (type === 'P' && toC !== fromC && !board[toR][toC]) {
    board[fromR][toC] = null;
    if (col === 'w') capturedByWhite.push('bP');
    else capturedByBlack.push('wP');
    epCapture = true;
    halfMoveClock = 0;
  }

  board[toR][toC] = piece;
  board[fromR][fromC] = null;

  // castling rook move
  if (type === 'K') {
    const kRow = col === 'w' ? 7 : 0;
    if (fromC === 4 && toC === 6) { // king-side
      board[kRow][5] = board[kRow][7];
      board[kRow][7] = null;
    } else if (fromC === 4 && toC === 2) { // queen-side
      board[kRow][3] = board[kRow][0];
      board[kRow][0] = null;
    }
    castlingRights[col + 'K'] = false;
    castlingRights[col + 'Q'] = false;
  }

  // castling rights update for rook moves
  if (type === 'R') {
    if (fromR === 7 && fromC === 7) castlingRights.wK = false;
    if (fromR === 7 && fromC === 0) castlingRights.wQ = false;
    if (fromR === 0 && fromC === 7) castlingRights.bK = false;
    if (fromR === 0 && fromC === 0) castlingRights.bQ = false;
  }

  // en passant target
  if (type === 'P' && Math.abs(toR - fromR) === 2)
    enPassantTarget = [(fromR + toR) / 2, fromC];
  else
    enPassantTarget = null;

  // promotion
  if (type === 'P' && (toR === 0 || toR === 7)) {
    if (promoteTo) {
      board[toR][toC] = col + promoteTo;
    } else {
      promotionPending = { from: [fromR, fromC], to: [toR, toC] };
    }
  }

  if (col === 'b') fullMoveNumber++;

  const opp = col === 'w' ? 'b' : 'w';
  currentTurn = opp;

  moveHistory.push({ notation, piece, from: [fromR, fromC], to: [toR, toC], captured, epCapture });

  return notation;
}

function buildNotation(fromR, fromC, toR, toC, promoteTo, captured) {
  const piece = board[fromR][fromC];
  const type = pieceType(piece);
  const files = 'abcdefgh';
  const toFile = files[toC];
  const toRank = 8 - toR;

  if (type === 'K') {
    if (toC - fromC === 2) return 'O-O';
    if (toC - fromC === -2) return 'O-O-O';
  }

  let notation = '';
  if (type === 'P') {
    if (captured || (enPassantTarget && toR === enPassantTarget[0] && toC === enPassantTarget[1]))
      notation = files[fromC] + 'x';
    notation += toFile + toRank;
    if (promoteTo) notation += '=' + promoteTo;
  } else {
    notation = type;
    if (captured) notation += 'x';
    notation += toFile + toRank;
  }
  return notation;
}

// ─── Initialization ───────────────────────────────────────────────────────────

function initGame() {
  board = INITIAL_BOARD.map(r => [...r]);
  currentTurn = 'w';
  selectedCell = null;
  legalMoves = [];
  castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
  enPassantTarget = null;
  moveHistory = [];
  gameOver = false;
  capturedByWhite = [];
  capturedByBlack = [];
  promotionPending = null;
  halfMoveClock = 0;
  fullMoveNumber = 1;
  renderBoard();
  updateStatus();
  renderMoveHistory();
  renderCaptured();
}

// ─── Rendering ────────────────────────────────────────────────────────────────

function renderBoard() {
  const boardEl = document.getElementById('board');
  boardEl.innerHTML = '';

  const inCheck = isInCheck(board, currentTurn);
  let kingR = -1, kingC = -1;
  if (inCheck) {
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++)
        if (board[r][c] === currentTurn + 'K') { kingR = r; kingC = c; }
  }

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      cell.dataset.r = r;
      cell.dataset.c = c;

      // highlights
      if (selectedCell && selectedCell[0] === r && selectedCell[1] === c)
        cell.classList.add('selected');

      if (legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
        if (board[r][c]) cell.classList.add('capture-hint');
        else cell.classList.add('move-hint');
      }

      if (inCheck && r === kingR && c === kingC)
        cell.classList.add('in-check');

      if (moveHistory.length > 0) {
        const last = moveHistory[moveHistory.length - 1];
        if ((last.from[0] === r && last.from[1] === c) ||
            (last.to[0] === r && last.to[1] === c))
          cell.classList.add('last-move');
      }

      const piece = board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece ' + (color(piece) === 'w' ? 'white-piece' : 'black-piece');
        span.textContent = PIECES[piece];
        cell.appendChild(span);
      }

      // rank/file labels
      if (c === 0) {
        const label = document.createElement('span');
        label.className = 'rank-label';
        label.textContent = 8 - r;
        cell.appendChild(label);
      }
      if (r === 7) {
        const label = document.createElement('span');
        label.className = 'file-label';
        label.textContent = 'abcdefgh'[c];
        cell.appendChild(label);
      }

      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }
}

function updateStatus() {
  const statusEl = document.getElementById('status');
  const turnEl = document.getElementById('turn-indicator');

  if (gameOver) return;

  const allMoves = getAllLegalMoves(board, currentTurn, castlingRights, enPassantTarget);
  const inCheck = isInCheck(board, currentTurn);
  const name = currentTurn === 'w' ? 'White' : 'Black';

  if (allMoves.length === 0) {
    gameOver = true;
    if (inCheck) {
      const winner = currentTurn === 'w' ? 'Black' : 'White';
      statusEl.textContent = `Checkmate! ${winner} wins! 🏆`;
      statusEl.className = 'status checkmate';
    } else {
      statusEl.textContent = "Stalemate! It's a draw. 🤝";
      statusEl.className = 'status stalemate';
    }
    document.getElementById('game-over-banner').classList.remove('hidden');
    document.getElementById('game-over-text').textContent = statusEl.textContent;
    return;
  }

  if (halfMoveClock >= 100) {
    gameOver = true;
    statusEl.textContent = "Draw by 50-move rule. 🤝";
    statusEl.className = 'status stalemate';
    document.getElementById('game-over-banner').classList.remove('hidden');
    document.getElementById('game-over-text').textContent = statusEl.textContent;
    return;
  }

  if (inCheck) {
    statusEl.textContent = `${name} is in check!`;
    statusEl.className = 'status check';
  } else {
    statusEl.textContent = `${name}'s turn`;
    statusEl.className = 'status';
  }

  turnEl.className = 'turn-indicator ' + (currentTurn === 'w' ? 'white-turn' : 'black-turn');
  turnEl.textContent = currentTurn === 'w' ? '♔ White' : '♚ Black';
}

function renderMoveHistory() {
  const histEl = document.getElementById('move-list');
  histEl.innerHTML = '';
  for (let i = 0; i < moveHistory.length; i += 2) {
    const li = document.createElement('li');
    const moveNum = Math.floor(i / 2) + 1;
    const white = moveHistory[i] ? moveHistory[i].notation : '';
    const black = moveHistory[i + 1] ? moveHistory[i + 1].notation : '';
    li.innerHTML = `<span class="move-num">${moveNum}.</span>
      <span class="move-white">${white}</span>
      ${black ? `<span class="move-black">${black}</span>` : ''}`;
    histEl.appendChild(li);
  }
  histEl.scrollTop = histEl.scrollHeight;
}

function renderCaptured() {
  const wEl = document.getElementById('captured-by-white');
  const bEl = document.getElementById('captured-by-black');
  wEl.textContent = capturedByWhite.map(p => PIECES[p]).join(' ');
  bEl.textContent = capturedByBlack.map(p => PIECES[p]).join(' ');
}

// ─── Promotion UI ─────────────────────────────────────────────────────────────

function showPromotionDialog(col) {
  const overlay = document.getElementById('promotion-overlay');
  const choices = document.getElementById('promotion-choices');
  choices.innerHTML = '';
  const promos = ['Q', 'R', 'B', 'N'];
  for (const p of promos) {
    const btn = document.createElement('button');
    btn.className = 'promo-btn';
    btn.textContent = PIECES[col + p];
    btn.title = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' }[p];
    btn.addEventListener('click', () => {
      overlay.classList.add('hidden');
      const { from, to } = promotionPending;
      board[to[0]][to[1]] = col + p;
      promotionPending = null;

      const opp = col === 'w' ? 'b' : 'w';
      currentTurn = opp; // already flipped in applyMove, but we need to update
      // Actually currentTurn was already set; just re-render
      renderBoard();
      updateStatus();
      renderMoveHistory();
      renderCaptured();
    });
    choices.appendChild(btn);
  }
  overlay.classList.remove('hidden');
}

// ─── Event handling ───────────────────────────────────────────────────────────

function onCellClick(e) {
  if (gameOver || promotionPending) return;
  const cell = e.currentTarget;
  const r = parseInt(cell.dataset.r);
  const c = parseInt(cell.dataset.c);

  if (selectedCell) {
    const [sr, sc] = selectedCell;

    // clicked a legal move target
    if (legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
      const piece = board[sr][sc];
      const col = color(piece);
      const type = pieceType(piece);
      const isPawnPromo = type === 'P' && (r === 0 || r === 7);

      applyMove(sr, sc, r, c);

      if (isPawnPromo) {
        showPromotionDialog(col);
      }

      selectedCell = null;
      legalMoves = [];
      renderBoard();
      updateStatus();
      renderMoveHistory();
      renderCaptured();
      return;
    }

    // clicked own piece → reselect
    if (color(board[r][c]) === currentTurn) {
      selectedCell = [r, c];
      legalMoves = getLegalMoves(board, r, c, castlingRights, enPassantTarget);
      renderBoard();
      return;
    }

    // deselect
    selectedCell = null;
    legalMoves = [];
    renderBoard();
    return;
  }

  // select
  if (color(board[r][c]) === currentTurn) {
    selectedCell = [r, c];
    legalMoves = getLegalMoves(board, r, c, castlingRights, enPassantTarget);
    renderBoard();
  }
}

// ─── Keyboard shortcut ────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    selectedCell = null;
    legalMoves = [];
    renderBoard();
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('new-game-btn').addEventListener('click', initGame);
  document.getElementById('new-game-banner-btn').addEventListener('click', () => {
    document.getElementById('game-over-banner').classList.add('hidden');
    initGame();
  });
  initGame();
});
