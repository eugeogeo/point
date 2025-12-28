import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import CasinoIcon from '@mui/icons-material/Casino';
import GridOnIcon from '@mui/icons-material/GridOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

enum Linha {
  VERTICAL,
  HORIZONTAL
}

const DOT_SIZE = 12;
const LINE_THICKNESS = 6;
const CELL_SIZE = 40;

type PlayerType = 'A' | 'B' | null;

interface GameState {
  horizontalLines: boolean[][];
  verticalLines: boolean[][];
  squares: PlayerType[][];
  currentPlayer: 'A' | 'B';
  scores: { A: number; B: number };
  movesLeft: number;
  diceValue: number | null;
  waitingForRoll: boolean;
}

const App = () => {

  const [boardSize, setBoardSize] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState({ A: 'Jogador A', B: 'Jogador B' });
  
  const [game, setGame] = useState<GameState | null>(null);

  const initializeGame = (size: number): GameState => ({
    horizontalLines: Array(size + 1).fill(null).map(() => Array(size).fill(false)),
    verticalLines: Array(size).fill(null).map(() => Array(size + 1).fill(false)),
    squares: Array(size).fill(null).map(() => Array(size).fill(null)),
    currentPlayer: 'A',
    scores: { A: 0, B: 0 },
    movesLeft: 0,
    diceValue: null,
    waitingForRoll: true,
  });

  const handleStartGame = (size: number) => {
    // Garante que se o nome estiver vazio, volta para o padrão
    setPlayerNames(prev => ({
      A: prev.A.trim() || 'Jogador A',
      B: prev.B.trim() || 'Jogador B'
    }));
    setBoardSize(size);
    setGame(initializeGame(size));
  };

  const handleResetGame = () => {
    if (boardSize) {
      setGame(initializeGame(boardSize));
    }
  };

  const handleBackToMenu = () => {
    setBoardSize(null);
    setGame(null);
  };

  const handleRollDice = () => {
    if (!game || !boardSize) return;

    const rolledNumber = Math.floor(Math.random() * boardSize) + 1;

    setGame(prev => prev ? ({
      ...prev,
      diceValue: rolledNumber,
      movesLeft: rolledNumber,
      waitingForRoll: false
    }) : null);
  };

  const handleLineClick = (type: Linha, row: number, column: number) => {
    if (!game || !boardSize) return;

    const isGameOver = game.scores.A + game.scores.B === boardSize * boardSize;

    if (isGameOver) return;
    if (game.waitingForRoll) return;
    if (game.movesLeft <= 0) return;

    if (type === Linha.HORIZONTAL && game.horizontalLines[row][column]) return;
    if (type === Linha.VERTICAL && game.verticalLines[row][column]) return;

    const newGame = { ...game };
    
    // Clonagem profunda
    newGame.horizontalLines = game.horizontalLines.map(row => [...row]);
    newGame.verticalLines = game.verticalLines.map(row => [...row]);
    newGame.squares = game.squares.map(row => [...row]);
    newGame.scores = { ...game.scores };

    if (type === Linha.HORIZONTAL){ 
      newGame.horizontalLines[row][column] = true;
    } else {
      newGame.verticalLines[row][column] = true;
    }

    newGame.movesLeft = game.movesLeft - 1;

    let squareClosed = false;
    const checkSquare = (rowCS: number, columnCS: number) => {
      if (
        newGame.horizontalLines[rowCS][columnCS] &&
        newGame.horizontalLines[rowCS + 1][columnCS] &&
        newGame.verticalLines[rowCS][columnCS] &&
        newGame.verticalLines[rowCS][columnCS + 1]
      ) {
        if (!newGame.squares[rowCS][columnCS]) {
          newGame.squares[rowCS][columnCS] = game.currentPlayer;
          squareClosed = true;
          newGame.scores[game.currentPlayer] += 1;
        }
      }
    };

    if (type === Linha.HORIZONTAL) {
      if (row < boardSize) checkSquare(row, column);
      if (row > 0) checkSquare(row - 1, column);
    } else {
      if (column < boardSize) checkSquare(row, column);
      if (column > 0) checkSquare(row, column - 1);
    }

    if (newGame.movesLeft === 0) {
      newGame.currentPlayer = game.currentPlayer === 'A' ? 'B' : 'A';
      newGame.waitingForRoll = true;
      newGame.diceValue = null; 
    }

    const totalScore = newGame.scores.A + newGame.scores.B;
    if (totalScore === boardSize * boardSize) {
        newGame.movesLeft = 0;
        newGame.waitingForRoll = false;
    }

    setGame(newGame);
  };

  // --- TELA DE MENU (SELEÇÃO DE TAMANHO E NOMES) ---
  if (!game || !boardSize) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', bgcolor: '#f5f5f5', gap: 4, p: 2 }}>
        <Paper elevation={4} sx={{ p: 5, borderRadius: 3, textAlign: 'center', maxWidth: 500, width: '100%' }}>
          <GridOnIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Jogo dos Pontinhos
          </Typography>
          
          <Box sx={{ my: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
             <TextField 
                label="Nome do Jogador 1" 
                variant="outlined" 
                fullWidth
                value={playerNames.A}
                onChange={(e) => setPlayerNames(prev => ({ ...prev, A: e.target.value }))}
             />
             <TextField 
                label="Nome do Jogador 2" 
                variant="outlined" 
                fullWidth
                value={playerNames.B}
                onChange={(e) => setPlayerNames(prev => ({ ...prev, B: e.target.value }))}
             />
          </Box>

          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Escolha o tamanho do tabuleiro para começar:
          </Typography>
          
          <Grid container spacing={2} justifyContent="center">
            {[3, 5, 7, 9].map((size) => (
              <Grid key={size}>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={() => handleStartGame(size)}
                  sx={{ width: 100, height: 60, fontSize: '1.2rem', borderRadius: 2 }}
                >
                  {size}x{size}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  }

  // --- TELA DO JOGO ---
  const isGameOver = game.scores.A + game.scores.B === boardSize * boardSize;
  const currentHoverColor = game.currentPlayer === 'A' ? 'primary.main' : 'secondary.main';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      
      {/* Placar e Controles */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2, width: '100%', maxWidth: 600 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          
          {/* Jogador A */}
          <Box sx={{ 
            opacity: game.currentPlayer === 'A' ? 1 : 0.5, 
            textAlign: 'center',
            borderBottom: game.currentPlayer === 'A' ? '3px solid #1976d2' : '3px solid transparent',
            pb: 1,
            minWidth: 100
          }}>
            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              {playerNames.A}
            </Typography>
            <Typography variant="h4">{game.scores.A}</Typography>
          </Box>
          
          {/* Centro / Dado */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 2 }}>
            {!isGameOver && (
               <>
                 {game.waitingForRoll ? (
                   <Button 
                     variant="contained" 
                     color={game.currentPlayer === 'A' ? 'primary' : 'secondary'}
                     startIcon={<CasinoIcon />}
                     onClick={handleRollDice}
                   >
                     Rolar
                   </Button>
                 ) : (
                   <Box sx={{ textAlign: 'center' }}>
                     <Typography variant="caption" color="text.secondary">Dado:</Typography>
                     <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{game.diceValue}</Typography>
                     <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                       Restam: <strong>{game.movesLeft}</strong>
                     </Typography>
                   </Box>
                 )}
               </>
            )}
          </Box>

          {/* Jogador B */}
          <Box sx={{ 
            opacity: game.currentPlayer === 'B' ? 1 : 0.5, 
            textAlign: 'center',
            borderBottom: game.currentPlayer === 'B' ? '3px solid #9c27b0' : '3px solid transparent',
            pb: 1,
            minWidth: 100
          }}>
            <Typography variant="subtitle1" color="secondary.main" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
              {playerNames.B}
            </Typography>
            <Typography variant="h4">{game.scores.B}</Typography>
          </Box>
        </Box>

        {isGameOver && (
          <Typography align="center" variant="h5" sx={{ mt: 1, fontWeight: 'bold', color: 'success.main' }}>
            {game.scores.A > game.scores.B ? `${playerNames.A} Venceu!` : game.scores.B > game.scores.A ? `${playerNames.B} Venceu!` : 'Empate!'}
          </Typography>
        )}
      </Paper>

      {/* Tabuleiro */}
      <Box sx={{ 
          position: 'relative', 
          p: 3, 
          bgcolor: 'white', 
          borderRadius: 4, 
          boxShadow: 3,
          opacity: game.waitingForRoll && !isGameOver ? 0.6 : 1,
          pointerEvents: game.waitingForRoll && !isGameOver ? 'none' : 'auto',
          transition: 'opacity 0.3s'
        }}>
        
        {Array.from({ length: boardSize + 1 }).map((_, row) => (
          <Box key={`r-${row}`} sx={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* Linha de Pontos e Linhas Horizontais */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {Array.from({ length: boardSize + 1 }).map((_, column) => (
                <React.Fragment key={`dot-h-${row}-${column}`}>
                  <Box sx={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: '50%', bgcolor: '#333', zIndex: 2 }} />
                  {column < boardSize && (
                    <Box 
                      onClick={() => handleLineClick(Linha.HORIZONTAL, row, column)}
                      sx={{
                        width: CELL_SIZE,
                        height: LINE_THICKNESS,
                        bgcolor: game.horizontalLines[row][column] ? 'black' : '#e0e0e0', 
                        cursor: isGameOver || game.waitingForRoll ? 'default' : 'pointer',
                        '&:hover': { 
                          bgcolor: !game.horizontalLines[row][column] && !isGameOver && !game.waitingForRoll
                            ? currentHoverColor
                            : undefined 
                        },
                        transition: 'background-color 0.2s'
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>

            {/* Linhas Verticais e Quadrados */}
            {row < boardSize && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {Array.from({ length: boardSize + 1 }).map((_, column) => (
                  <React.Fragment key={`v-sq-${row}-${column}`}>
                    <Box 
                       onClick={() => handleLineClick(Linha.VERTICAL, row, column)}
                       sx={{
                         width: LINE_THICKNESS,
                         height: CELL_SIZE,
                         bgcolor: game.verticalLines[row][column] ? 'black' : '#e0e0e0',
                         cursor: isGameOver || game.waitingForRoll ? 'default' : 'pointer',
                         marginLeft: `${(DOT_SIZE - LINE_THICKNESS)/2}px`, 
                         marginRight: `${(DOT_SIZE - LINE_THICKNESS)/2}px`,
                         '&:hover': { 
                           bgcolor: !game.verticalLines[row][column] && !isGameOver && !game.waitingForRoll
                             ? currentHoverColor
                             : undefined 
                         },
                         transition: 'background-color 0.2s'
                       }}
                    />

                    {column < boardSize && (
                      <Box sx={{
                        width: CELL_SIZE,
                        height: CELL_SIZE,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: game.squares[row][column] === 'A' ? 'rgba(25, 118, 210, 0.3)' : game.squares[row][column] === 'B' ? 'rgba(156, 39, 176, 0.3)' : 'transparent',
                        transition: 'background-color 0.3s'
                      }}>
                        {game.squares[row][column] && (
                          <Typography variant="h5" sx={{ 
                            color: game.squares[row][column] === 'A' ? 'primary.main' : 'secondary.main',
                            fontWeight: 'bold',
                            userSelect: 'none'
                          }}>
                            {/* Mostra a inicial do nome escolhido */}
                            {game.squares[row][column] === 'A' ? playerNames.A.charAt(0).toUpperCase() : playerNames.B.charAt(0).toUpperCase()}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </React.Fragment>
                ))}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Botões de Ação do Jogo */}
      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
        <Button 
          variant="outlined" 
          color="inherit"
          startIcon={<ReplayIcon />} 
          onClick={handleResetGame}
        >
          Reiniciar Tabuleiro
        </Button>
        <Button 
          variant="text" 
          color="inherit"
          startIcon={<ArrowBackIcon />} 
          onClick={handleBackToMenu}
        >
          Mudar Tamanho
        </Button>
      </Box>
    </Box>
  );
};

export default App;