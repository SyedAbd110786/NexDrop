import { useSocket, SocketProvider } from "./context/SocketContext";
import PairScreen from "./pages/PairScreen";
import ChatScreen from "./pages/ChatScreen";
import "./index.css";

function AppInner() {
  const { pairedDevice } = useSocket();
  return pairedDevice ? <ChatScreen /> : <PairScreen />;
}

export default function App() {
  return (
    <SocketProvider>
      <AppInner />
    </SocketProvider>
  );
}
