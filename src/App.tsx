import React, { useState, useEffect } from 'react';
import { Box, Button, Typography, Paper, Grid, TextField, Alert } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import GridOnIcon from '@mui/icons-material/GridOn';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { io, Socket } from 'socket.io-client';

// --- TIPOS E INTERFACES ---

enum Linha {
  VERTICAL,
  HORIZONTAL
}

const DOT_SIZE = 12;
const LINE_THICKNESS = 6;
const CELL_SIZE = 40;

// O estado do jogo agora reflete exatamente o que vem do servidor
interface GameState {
  horizontalLines: boolean[][];
  verticalLines: boolean[][];
  squares: (string | null)[][];
  currentPlayer: 'A' | 'B';
  scores: { A: number; B: number };
  movesLeft: number;
  diceValue: number | null;
  waitingForRoll: boolean;
  winner: string | null; // Adicionado campo winner
}

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const App = () => {
  // --- ESTADOS ---
  
  // Conexão e Sala
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [inputRoomId, setInputRoomId] = useState(""); // Para o campo de texto "Entrar na Sala"
  const [myPlayerType, setMyPlayerType] = useState<'A' | 'B' | null>(null);

  // Dados do Jogo
  const [game, setGame] = useState<GameState | null>(null);
  const [boardSize, setBoardSize] = useState<number | null>(null);
  const [playerNames, setPlayerNames] = useState({ A: 'Jogador A', B: 'Jogador B' });
  const [statusMessage, setStatusMessage] = useState("");

  // --- EFEITO: CONEXÃO COM SOCKET ---
  useEffect(() => {
    // Conecta ao backend (ajuste a URL se necessário)
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket'],
    });
    setSocket(newSocket);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setStatusMessage("Conectado ao servidor!");
    });

    // 1. Resposta ao criar sala
    newSocket.on('room_created', (data) => {
      setRoomId(data.roomId);
      setMyPlayerType(data.playerType);
      setStatusMessage(`Sala criada! ID: ${data.roomId}. Aguardando oponente...`);
    });

    // 2. Jogo começou
    newSocket.on('game_start', (data) => {
      setRoomId(data.roomId);
      setGame(data.gameState);
      setBoardSize(data.boardSize);
      
      // Fix de Identidade (que fizemos antes)
      const myInfo = data.players.find((p: any) => p.socketId === newSocket.id);
      if (myInfo) {
        setMyPlayerType(myInfo.playerType);
      }
      
      // Atualiza nomes
      const pA = data.players.find((p: any) => p.playerType === 'A');
      const pB = data.players.find((p: any) => p.playerType === 'B');
      setPlayerNames({
        A: pA ? pA.name : 'Jogador A',
        B: pB ? pB.name : 'Jogador B'
      });
      
      setStatusMessage("O Jogo Começou!");
    });

    // 3. Atualização de estado a cada jogada
    newSocket.on('update_game', (newGameState: GameState) => {
      setGame(newGameState);
    });

    // 4. Erros (sala cheia, não existe, etc)
    newSocket.on('error', (msg: string) => {
      alert(msg);
      setStatusMessage(msg);
    });

    newSocket.on('opponent_left', () => {
      alert("O oponente desconectou! O jogo será encerrado.");
      setGame(null);      // Reseta o estado do jogo
      setBoardSize(null); // Volta para o lobby
      setRoomId("");      // Limpa o ID da sala
      setMyPlayerType(null);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // --- AÇÕES DO JOGADOR (ENVIA PARA O SERVER) ---

  const handleCreateRoom = (size: number) => {
    if (!socket) return;
    // Envia evento de criar sala
    socket.emit('create_room', { name: playerNames.A, boardSize: size });
  };

  const handleJoinRoom = () => {
    if (!socket || !inputRoomId) return;
    // Envia evento de entrar em sala existente
    socket.emit('join_room', { roomId: inputRoomId, name: playerNames.B });
  };

  const handleRollDice = () => {
    if (!socket || !game || !roomId) return;
    // Só rola se for minha vez
    if (game.currentPlayer !== myPlayerType) return;
    
    socket.emit('roll_dice', { roomId });
  };

  const handleLineClick = (type: Linha, row: number, column: number) => {
    if (!socket || !game || !roomId) return;
    
    // Validações visuais básicas (opcional, pois o server valida também)
    if (game.currentPlayer !== myPlayerType) return;
    if (game.waitingForRoll) return;

    socket.emit('make_move', { roomId, type, row, column });
  };

  const handleLeaveGame = () => {
    // Simples refresh para sair do jogo e limpar estado
    window.location.reload();
  };

  // --- RENDERIZAÇÃO: LOBBY (MENU INICIAL) ---
  if (!game || !boardSize) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: '#f5f5f5', gap: 4, p: 2 }}>
        <Paper elevation={4} sx={{ p: 5, borderRadius: 3, textAlign: 'center', maxWidth: 500, width: '100%' }}>
          <GridOnIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Jogo dos Pontinhos Online
          </Typography>
          
          <Typography color={isConnected ? "success.main" : "error.main"} sx={{ mb: 3, fontWeight: 'bold' }}>
            {isConnected ? "🟢 Conectado ao Servidor" : "🔴 Desconectado..."}
          </Typography>

          {/* Se já criou a sala e está esperando */}
          {roomId && myPlayerType === 'A' ? (
             <Box sx={{ my: 4 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Sala Criada com Sucesso!
                </Alert>
                <Typography variant="h5" sx={{ fontWeight: 'bold', letterSpacing: 4, my: 2 }}>
                   ID: {roomId}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                   Compartilhe este ID com seu amigo para ele entrar.
                   <br/>Aguardando oponente...
                </Typography>
             </Box>
          ) : (
            <>
              {/* Formulário de Criação / Entrada */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                
                {/* CRIAR SALA */}
                <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>Criar Nova Sala</Typography>
                    <TextField 
                        label="Seu Nome" 
                        size="small"
                        fullWidth 
                        sx={{ mb: 2 }}
                        value={playerNames.A}
                        onChange={(e) => setPlayerNames(prev => ({ ...prev, A: e.target.value }))}
                    />
                    <Typography variant="body2" sx={{ mb: 1 }}>Escolha o Tamanho:</Typography>
                    <Grid container spacing={1} justifyContent="center">
                        {[3, 5, 7].map((size) => (
                        <Grid key={size}>
                            <Button variant="outlined" onClick={() => handleCreateRoom(size)}>
                                {size}x{size}
                            </Button>
                        </Grid>
                        ))}
                    </Grid>
                </Box>

                <Typography variant="body1" color="text.secondary">- OU -</Typography>

                {/* ENTRAR EM SALA */}
                <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 2, bgcolor: '#fafafa' }}>
                    <Typography variant="h6" gutterBottom>Entrar em Sala</Typography>
                    <TextField 
                        label="Seu Nome" 
                        size="small"
                        fullWidth 
                        sx={{ mb: 2 }}
                        value={playerNames.B}
                        onChange={(e) => setPlayerNames(prev => ({ ...prev, B: e.target.value }))}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <TextField 
                            label="ID da Sala (ex: A1B2)" 
                            size="small"
                            fullWidth
                            value={inputRoomId}
                            onChange={(e) => setInputRoomId(e.target.value.toUpperCase())}
                        />
                        <Button variant="contained" onClick={handleJoinRoom} disabled={!inputRoomId}>
                            Entrar
                        </Button>
                    </Box>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  // --- RENDERIZAÇÃO: TABULEIRO DO JOGO ---
  const isMyTurn = game.currentPlayer === myPlayerType;
  const currentHoverColor = game.currentPlayer === 'A' ? 'primary.main' : 'secondary.main';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, p: 4, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      
      {/* Cabeçalho de Status */}
      <Paper sx={{ p: 1, px: 3, borderRadius: 10, bgcolor: isMyTurn ? '#e3f2fd' : '#fff' }}>
         <Typography variant="subtitle2" color="text.secondary">
            {isMyTurn ? "Sua vez de jogar!" : `Aguardando ${game.currentPlayer === 'A' ? playerNames.A : playerNames.B}...`}
         </Typography>
      </Paper>

      {/* Placar e Controles */}
      <Paper elevation={3} sx={{ p: 2, borderRadius: 2, width: '100%', maxWidth: 600 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          
          {/* Jogador A */}
          <Box sx={{ 
            opacity: game.currentPlayer === 'A' ? 1 : 0.5, 
            textAlign: 'center',
            borderBottom: game.currentPlayer === 'A' ? '3px solid #1976d2' : '3px solid transparent',
            pb: 1, minWidth: 100
          }}>
            <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 'bold' }}>{playerNames.A}</Typography>
            <Typography variant="h4">{game.scores.A}</Typography>
          </Box>
          
          {/* Centro / Dado */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: 2 }}>
            {!game.winner ? (
               <>
                 {game.waitingForRoll ? (
                   <Button 
                     variant="contained" 
                     color={game.currentPlayer === 'A' ? 'primary' : 'secondary'}
                     startIcon={<CasinoIcon />}
                     onClick={handleRollDice}
                     disabled={!isMyTurn} // Desabilita se não for minha vez
                   >
                     {isMyTurn ? "ROLAR" : "AGUARDE"}
                   </Button>
                 ) : (
                   <Box sx={{ textAlign: 'center' }}>
                     <Typography variant="caption" color="text.secondary">Dado:</Typography>
                     <Typography variant="h4" sx={{ fontWeight: 'bold' }}>{game.diceValue}</Typography>
                     <Typography variant="body2" sx={{ color: 'text.secondary' }}>Restam: <strong>{game.movesLeft}</strong></Typography>
                   </Box>
                 )}
               </>
            ) : (
                <Typography variant="h5" color="success.main" fontWeight="bold">FIM DE JOGO</Typography>
            )}
          </Box>

          {/* Jogador B */}
          <Box sx={{ 
            opacity: game.currentPlayer === 'B' ? 1 : 0.5, 
            textAlign: 'center',
            borderBottom: game.currentPlayer === 'B' ? '3px solid #9c27b0' : '3px solid transparent',
            pb: 1, minWidth: 100
          }}>
            <Typography variant="subtitle1" color="secondary.main" sx={{ fontWeight: 'bold' }}>{playerNames.B}</Typography>
            <Typography variant="h4">{game.scores.B}</Typography>
          </Box>
        </Box>

        {game.winner && (
          <Box textAlign="center" mt={2}>
             <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main' }}>
               {game.winner === 'Draw' ? 'Empate!' : `Vencedor: ${game.winner === 'A' ? playerNames.A : playerNames.B}`}
             </Typography>
             <Button startIcon={<ArrowBackIcon />} onClick={handleLeaveGame} sx={{ mt: 1 }}>Sair</Button>
          </Box>
        )}
      </Paper>

      {/* Tabuleiro */}
      <Box sx={{ 
          position: 'relative', p: 3, bgcolor: 'white', borderRadius: 4, boxShadow: 3,
          // Bloqueia cliques se não for sua vez ou se precisar rolar dado
          pointerEvents: (isMyTurn && !game.waitingForRoll && !game.winner) ? 'auto' : 'none',
          opacity: (isMyTurn && !game.waitingForRoll && !game.winner) ? 1 : 0.7
        }}>
        
        {Array.from({ length: boardSize + 1 }).map((_, row) => (
          <Box key={`r-${row}`} sx={{ display: 'flex', flexDirection: 'column' }}>
            
            {/* Linha Horizontal */}
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {Array.from({ length: boardSize + 1 }).map((_, column) => (
                <React.Fragment key={`dot-h-${row}-${column}`}>
                  <Box sx={{ width: DOT_SIZE, height: DOT_SIZE, borderRadius: '50%', bgcolor: '#333', zIndex: 2 }} />
                  {column < boardSize && (
                    <Box 
                      onClick={() => handleLineClick(Linha.HORIZONTAL, row, column)}
                      sx={{
                        width: CELL_SIZE, height: LINE_THICKNESS,
                        bgcolor: game.horizontalLines[row][column] ? 'black' : '#e0e0e0', 
                        cursor: 'pointer',
                        '&:hover': { bgcolor: !game.horizontalLines[row][column] ? currentHoverColor : undefined },
                        transition: '0.2s'
                      }}
                    />
                  )}
                </React.Fragment>
              ))}
            </Box>

            {/* Linha Vertical */}
            {row < boardSize && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {Array.from({ length: boardSize + 1 }).map((_, column) => (
                  <React.Fragment key={`v-sq-${row}-${column}`}>
                    <Box 
                       onClick={() => handleLineClick(Linha.VERTICAL, row, column)}
                       sx={{
                         width: LINE_THICKNESS, height: CELL_SIZE,
                         bgcolor: game.verticalLines[row][column] ? 'black' : '#e0e0e0',
                         cursor: 'pointer',
                         marginLeft: `${(DOT_SIZE - LINE_THICKNESS)/2}px`, marginRight: `${(DOT_SIZE - LINE_THICKNESS)/2}px`,
                         '&:hover': { bgcolor: !game.verticalLines[row][column] ? currentHoverColor : undefined },
                         transition: '0.2s'
                       }}
                    />

                    {column < boardSize && (
                      <Box sx={{
                        width: CELL_SIZE, height: CELL_SIZE,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: game.squares[row][column] === 'A' ? 'rgba(25, 118, 210, 0.3)' : game.squares[row][column] === 'B' ? 'rgba(156, 39, 176, 0.3)' : 'transparent',
                      }}>
                        {game.squares[row][column] && (
                          <Typography variant="h5" sx={{ 
                            color: game.squares[row][column] === 'A' ? 'primary.main' : 'secondary.main',
                            fontWeight: 'bold'
                          }}>
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
      
      <Typography variant="caption" color="text.secondary">ID da Sala: {roomId}</Typography>
    </Box>
  );
};

export default App;