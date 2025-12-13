import React, { useState } from 'react';
import { Box, Button, Typography, Paper } from '@mui/material';
import ReplayIcon from '@mui/icons-material/Replay';
import CasinoIcon from '@mui/icons-material/Casino'; // Ícone do dado

enum Linha {
  VERTICAL,
  HORIZONTAL
}

// Configurações do Grid
const BOARD_SIZE = 8; 
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
  // Novos estados para o dado
  movesLeft: number;      // Quantas linhas o jogador ainda pode colocar
  diceValue: number | null; // Valor que saiu no dado
  waitingForRoll: boolean;  // Se o jogador precisa rolar o dado antes de jogar
}

const App = () => {
  const initializeGame = (): GameState => ({
    horizontalLines: Array(BOARD_SIZE + 1).fill(null).map(() => Array(BOARD_SIZE).fill(false)),
    verticalLines: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE + 1).fill(false)),
    squares: Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)),
    currentPlayer: 'A',
    scores: { A: 0, B: 0 },
    movesLeft: 0,
    diceValue: null,
    waitingForRoll: true, // Começa esperando o Player A rolar
  });

  const [game, setGame] = useState<GameState>(initializeGame());

  // Função para sortear o número
  const handleRollDice = () => {
    const rolledNumber = Math.floor(Math.random() * 6) + 1; // 1 a 6
    setGame(prev => ({
      ...prev,
      diceValue: rolledNumber,
      movesLeft: rolledNumber,
      waitingForRoll: false
    }));
  };

  const handleLineClick = (type: Linha, row: number, column: number) => {
    const isGameOver = game.scores.A + game.scores.B === BOARD_SIZE * BOARD_SIZE;

    if (isGameOver) return;

    // Bloqueia se o jogador ainda não rolou o dado
    if (game.waitingForRoll) return;

    // Bloqueia se não houver movimentos (embora a UI deva prevenir isso)
    if (game.movesLeft <= 0) return;

    if (type === Linha.HORIZONTAL && game.horizontalLines[row][column]) return;
    if (type === Linha.VERTICAL && game.verticalLines[row][column]) return;

    const newGame = { ...game };
    
    // Clonagem profunda
    newGame.horizontalLines = game.horizontalLines.map(row => [...row]);
    newGame.verticalLines = game.verticalLines.map(row => [...row]);
    newGame.squares = game.squares.map(row => [...row]);
    newGame.scores = { ...game.scores };

    // Preenche a linha
    if (type === Linha.HORIZONTAL){ 
      newGame.horizontalLines[row][column] = true;
    } else {
      newGame.verticalLines[row][column] = true;
    }

    // Decrementa os movimentos restantes
    newGame.movesLeft = game.movesLeft - 1;

    // Verifica quadrados
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
      if (row < BOARD_SIZE) checkSquare(row, column);
      if (row > 0) checkSquare(row - 1, column);
    } else {
      if (column < BOARD_SIZE) checkSquare(row, column);
      if (column > 0) checkSquare(row, column - 1);
    }

    // LÓGICA DE FIM DE TURNO ALTERADA:
    // O turno só acaba quando os movimentos do dado chegam a 0.
    // Fechar quadrado dá ponto, mas não reseta o dado nem impede a contagem.
    if (newGame.movesLeft === 0) {
      // Passa a vez
      newGame.currentPlayer = game.currentPlayer === 'A' ? 'B' : 'A';
      // Prepara para o próximo jogador rolar
      newGame.waitingForRoll = true;
      newGame.diceValue = null; 
    }

    // Verifica se o jogo acabou após o movimento (para não deixar movimentos sobrando num jogo finalizado)
    const totalScore = newGame.scores.A + newGame.scores.B;
    if (totalScore === BOARD_SIZE * BOARD_SIZE) {
        newGame.movesLeft = 0;
        newGame.waitingForRoll = false;
    }

    setGame(newGame);
  };

  const isGameOver = game.scores.A + game.scores.B === BOARD_SIZE * BOARD_SIZE;

  // define a cor de hover baseada no jogador atual
  const currentHoverColor = game.currentPlayer === 'A' ? 'primary.main' : 'secondary.main';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      
      {/* Placar e Controles */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2, width: '100%', maxWidth: 450 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ opacity: game.currentPlayer === 'A' ? 1 : 0.5 }}>
            <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
              Jogador A
            </Typography>
            <Typography variant="h4">{game.scores.A}</Typography>
          </Box>
          
          {/* Área Central: Status do Dado */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            {!isGameOver && (
               <>
                 {game.waitingForRoll ? (
                   <Button 
                     variant="contained" 
                     color={game.currentPlayer === 'A' ? 'primary' : 'secondary'}
                     startIcon={<CasinoIcon />}
                     onClick={handleRollDice}
                   >
                     Rolar Dado
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

          <Box sx={{ opacity: game.currentPlayer === 'B' ? 1 : 0.5, textAlign: 'right' }}>
            <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 'bold' }}>
              Jogador B
            </Typography>
            <Typography variant="h4">{game.scores.B}</Typography>
          </Box>
        </Box>

        {isGameOver && (
          <Typography align="center" variant="h5" sx={{ mt: 1, fontWeight: 'bold', color: 'success.main' }}>
            {game.scores.A > game.scores.B ? 'Jogador A Venceu!' : game.scores.B > game.scores.A ? 'Jogador B Venceu!' : 'Empate!'}
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
          // Desabilita visualmente o tabuleiro se estiver esperando rolar o dado
          opacity: game.waitingForRoll && !isGameOver ? 0.6 : 1,
          pointerEvents: game.waitingForRoll && !isGameOver ? 'none' : 'auto',
          transition: 'opacity 0.3s'
        }}>
        
        {Array.from({ length: BOARD_SIZE + 1 }).map((_, row) => (
          <Box key={`r-${row}`} sx={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* Linha de Pontos e Linhas Horizontais */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {Array.from({ length: BOARD_SIZE + 1 }).map((_, column) => (
                <React.Fragment key={`dot-h-${row}-${column}`}>
                  {/* Ponto */}
                  <Box sx={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: '50%', bgcolor: '#333', zIndex: 2 }} />

                  {/* Linha Horizontal */}
                  {column < BOARD_SIZE && (
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
            {row < BOARD_SIZE && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {Array.from({ length: BOARD_SIZE + 1 }).map((_, column) => (
                  <React.Fragment key={`v-sq-${row}-${column}`}>
                    
                    {/* Linha Vertical */}
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

                    {/* Quadrado */}
                    {column < BOARD_SIZE && (
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
                            {game.squares[row][column]}
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

      <Button 
        variant="outlined" 
        color="inherit"
        startIcon={<ReplayIcon />} 
        onClick={() => setGame(initializeGame())}
        sx={{ mt: 2 }}
      >
        Reiniciar Jogo
      </Button>
    </Box>
  );
};

export default App;