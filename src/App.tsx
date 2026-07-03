import { useState } from "react";
import { useGameState } from "./hooks/useGameState";
import { useGameActions } from "./hooks/useGameActions";
import { HomeScreen } from "./components/HomeScreen";
import { SetupScreen } from "./components/SetupScreen";
import { GameBoard } from "./components/GameBoard";
import { FactionDetailModal } from "./components/FactionDetailModal";
import { BattleLogModal } from "./components/BattleLogModal";
import { ActionLogToast } from "./components/ActionLogToast";
import { ReviveModal } from "./components/ReviveModal";
import { RulesModal } from "./components/RulesModal";

function App() {
  const state = useGameState();
  const actions = useGameActions(
    state.gameState,
    state.activeFaction,
    state.setGameState,
    state.setScreen,
    state.factionCount,
    state.ruleConfig,
    state.setFactionCount,
    state.setRuleConfig,
  );

  const [showRules, setShowRules] = useState(false);
  const [showFactions, setShowFactions] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showRevive, setShowRevive] = useState(false);

  return (
    <div className="min-h-screen bg-transparent text-amber-50">
      <main
        className={`mx-auto flex w-full max-w-6xl flex-col ${
          state.screen === "game"
            ? "h-dvh overflow-hidden px-2 py-2 sm:px-4"
            : "min-h-screen px-4 py-5 sm:px-6 lg:px-8"
        }`}
      >
        {state.screen === "home" && (
          <HomeScreen
            hasSavedGame={state.hasSavedGame}
            reinforcementPerTurn={state.ruleConfig.economy.reinforcementPerTurn}
            civilianGoldOutput={state.ruleConfig.economy.civilianGoldOutput}
            soldierUpkeep={state.ruleConfig.economy.soldierUpkeep}
            onContinue={actions.continueGame}
            onNewGame={() => state.setScreen("setup")}
            onShowRules={() => setShowRules(true)}
          />
        )}

        {state.screen === "setup" && (
          <SetupScreen
            factionCount={state.factionCount}
            ruleConfig={state.ruleConfig}
            includeSubFactions={state.includeSubFactions}
            includeNeutral={state.includeNeutral}
            onFactionCountChange={state.setFactionCount}
            onRuleConfigChange={state.setRuleConfig}
            onSubFactionsChange={state.setIncludeSubFactions}
            onNeutralChange={state.setIncludeNeutral}
            onStartGame={() => actions.startGame(state.includeSubFactions, state.includeNeutral)}
            onBack={() => state.setScreen("home")}
          />
        )}

        {state.screen === "game" && state.gameState && state.activeFaction && (
          <GameBoard
            gameState={state.gameState}
            activeFaction={state.activeFaction}
            actions={actions}
            onShowRules={() => setShowRules(true)}
            onShowRevive={() => setShowRevive(true)}
            onShowFactions={() => setShowFactions(true)}
            onShowLogs={() => setShowLogs(true)}
          />
        )}
      </main>

      <RulesModal open={showRules} onClose={() => setShowRules(false)} ruleConfig={state.ruleConfig} />

      {state.gameState && state.activeFaction && (
        <>
          <FactionDetailModal
            open={showFactions}
            onClose={() => setShowFactions(false)}
            factions={state.gameState.factions}
            activeFactionId={state.activeFaction.id}
          />
          <ReviveModal
            open={showRevive}
            onClose={() => setShowRevive(false)}
            activeFaction={state.activeFaction}
            defeatedFactions={actions.defeatedFactions}
            getRestriction={actions.getReviveRestriction}
            onRevive={actions.handleRevive}
            hasWinner={!!state.gameState.winnerId}
          />
        </>
      )}

      {state.gameState && (
        <BattleLogModal open={showLogs} onClose={() => setShowLogs(false)} logs={actions.latestLogs} />
      )}

      <ActionLogToast logs={actions.lastActionLogs} onDismiss={() => actions.setLastActionLogs([])} />
    </div>
  );
}

export default App;
