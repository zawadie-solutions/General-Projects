import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ProgressProvider } from './store/progress'
import { Home } from './pages/Home'
import { LevelMap } from './pages/LevelMap'
import { LevelDetail } from './pages/LevelDetail'
import { ComingSoonLevel } from './pages/ComingSoonLevel'
import { Dashboard } from './pages/Dashboard'
import { DailyChallenge } from './pages/DailyChallenge'
import { PromptBattle } from './pages/PromptBattle'
import { Leaderboard } from './pages/Leaderboard'
import { LEVELS } from './data/levels'
import { foundationContent } from './data/foundation'
import { coreSkillsContent } from './data/coreSkills'
import { intermediateContent } from './data/intermediate'
import { advancedContent } from './data/advanced'
import { masteryContent } from './data/mastery'

const foundationLevel = LEVELS.find((l) => l.id === 'foundation')!
const coreSkillsLevel = LEVELS.find((l) => l.id === 'core-skills')!
const intermediateLevel = LEVELS.find((l) => l.id === 'intermediate')!
const advancedLevel = LEVELS.find((l) => l.id === 'advanced')!
const masteryLevel = LEVELS.find((l) => l.id === 'mastery')!

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ProgressProvider>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Home />} />
            <Route path="levels" element={<LevelMap />} />
            <Route
              path="levels/foundation"
              element={
                <LevelDetail
                  level={foundationLevel}
                  content={foundationContent}
                  badgeIds={{
                    fixIt: 'clear-instructions',
                    writeIt: 'great-with-examples',
                    spotProblem: 'sharp-eye',
                    graduate: 'foundation-graduate',
                  }}
                  nextLevel={coreSkillsLevel}
                />
              }
            />
            <Route
              path="levels/core-skills"
              element={
                <LevelDetail
                  level={coreSkillsLevel}
                  content={coreSkillsContent}
                  badgeIds={{
                    fixIt: 'role-player',
                    writeIt: 'format-pro',
                    spotProblem: 'sharp-eye',
                    graduate: 'core-skills-graduate',
                  }}
                  nextLevel={intermediateLevel}
                />
              }
            />
            <Route
              path="levels/intermediate"
              element={
                <LevelDetail
                  level={intermediateLevel}
                  content={intermediateContent}
                  badgeIds={{
                    fixIt: 'context-setter',
                    writeIt: 'step-thinker',
                    spotProblem: 'sharp-eye',
                    graduate: 'intermediate-graduate',
                  }}
                  nextLevel={advancedLevel}
                />
              }
            />
            <Route
              path="levels/advanced"
              element={
                <LevelDetail
                  level={advancedLevel}
                  content={advancedContent}
                  badgeIds={{
                    fixIt: 'combo-fixer',
                    writeIt: 'multi-step-master',
                    spotProblem: 'sharp-eye',
                    graduate: 'advanced-graduate',
                  }}
                  nextLevel={masteryLevel}
                />
              }
            />
            <Route
              path="levels/mastery"
              element={
                <LevelDetail
                  level={masteryLevel}
                  content={masteryContent}
                  badgeIds={{
                    fixIt: 'quick-fixer',
                    writeIt: 'prompt-architect',
                    spotProblem: 'sharp-eye',
                    graduate: 'prompt-master',
                  }}
                />
              }
            />
            <Route path="levels/:levelId" element={<ComingSoonLevel />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="daily-challenge" element={<DailyChallenge />} />
            <Route path="prompt-battle" element={<PromptBattle />} />
          </Route>
        </Routes>
      </ProgressProvider>
    </BrowserRouter>
  </StrictMode>,
)
