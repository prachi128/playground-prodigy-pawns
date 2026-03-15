"use client"

import { useState } from "react"
import { Shield, Users, Eye, Share2 } from "lucide-react"

export function PrivacySettings() {
  const [settings, setSettings] = useState({
    socialEnabled: true,
    friendsVisible: true,
    profilePublic: false,
    showAchievements: true,
    shareActivity: true,
    classVisible: true,
  })

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggles = [
    {
      key: "socialEnabled",
      label: "Enable Social Features",
      description: "Allow friends and class interaction",
      icon: Users,
    },
    {
      key: "friendsVisible",
      label: "Friends Can See My Progress",
      description: "Let friends view your level and stats",
      icon: Eye,
    },
    {
      key: "profilePublic",
      label: "Public Profile",
      description: "Anyone in the class can view your profile",
      icon: Users,
    },
    {
      key: "showAchievements",
      label: "Share Achievements",
      description: "Show achievements in class activity",
      icon: Share2,
    },
    {
      key: "shareActivity",
      label: "Share Activity",
      description: "Let friends see when you complete quests",
      icon: Share2,
    },
    {
      key: "classVisible",
      label: "Visible to Class",
      description: "Appear in class rankings and leaderboards",
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="font-heading text-2xl font-bold">Privacy & Safety</h2>
        </div>
        <p className="text-sm text-muted-foreground">Control your social experience and data sharing</p>
      </div>

      {/* Parent note */}
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
        <p className="text-sm font-bold text-blue-900 mb-2">For Parents:</p>
        <p className="text-sm text-blue-800">
          All features are designed with child safety in mind. Real names are not required, usernames only.
          All content is moderated and children can report inappropriate behavior.
        </p>
      </div>

      {/* Settings toggles */}
      <div className="space-y-3">
        {toggles.map((toggle) => {
          const Icon = toggle.icon
          return (
            <div
              key={toggle.key}
              className="flex items-center justify-between rounded-xl border-2 border-border bg-card p-4 hover:bg-accent/50 transition-all"
            >
              <div className="flex items-start gap-3 flex-1">
                <Icon className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-card-foreground">{toggle.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{toggle.description}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(toggle.key)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  settings[toggle.key as keyof typeof settings]
                    ? "bg-green-500 text-white"
                    : "bg-border text-muted-foreground"
                }`}
              >
                {settings[toggle.key as keyof typeof settings] ? "On" : "Off"}
              </button>
            </div>
          )
        })}
      </div>

      {/* Safety info */}
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-4">
        <p className="text-sm font-bold text-green-900 mb-3">Safety Features:</p>
        <ul className="space-y-2 text-sm text-green-800">
          <li className="flex gap-2">
            <span>✓</span>
            <span>All users must be 13+ with parental consent</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Usernames only - no real names or personal info</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Content moderation and reporting system</span>
          </li>
          <li className="flex gap-2">
            <span>✓</span>
            <span>Parents can review all social interactions</span>
          </li>
        </ul>
      </div>

      {/* Save button */}
      <button className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold hover:shadow-lg transition-all hover:scale-105">
        Save Privacy Settings
      </button>
    </div>
  )
}
