'use client'

import { useState } from 'react'
import { Star, Lock, Crown, Heart, ShoppingCart, Check, X, Zap } from 'lucide-react'

type ItemRarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'

interface ShopItem {
  id: string
  name: string
  cost: number
  icon: string
  category: 'avatars' | 'accessories' | 'themes' | 'collectibles' | 'powerups' | 'premium'
  rarity: ItemRarity
  description: string
  owned: boolean
  equipped: boolean
  unlocked: boolean
  requirement?: string
  requirementProgress?: number
  requirementMax?: number
  isLimitedTime?: boolean
  timeRemaining?: string
  isBundle?: boolean
  bundleDiscount?: number
  acquiredDate?: string
}

const shopItems: ShopItem[] = [
  {
    id: '1',
    name: 'Cool Sunglasses',
    cost: 500,
    icon: '😎',
    category: 'accessories',
    rarity: 'Common',
    description: 'Look cool while you checkmate!',
    owned: true,
    equipped: true,
    unlocked: true,
  },
  {
    id: '2',
    name: 'Golden Crown',
    cost: 1000,
    icon: '👑',
    category: 'avatars',
    rarity: 'Rare',
    description: 'Rule the board like royalty!',
    owned: false,
    equipped: false,
    unlocked: false,
    requirement: 'Reach Knight 5',
    requirementProgress: 3,
    requirementMax: 5,
  },
  {
    id: '3',
    name: 'Fire Trail',
    cost: 2000,
    icon: '🔥',
    category: 'themes',
    rarity: 'Epic',
    description: 'Leave a blazing trail!',
    owned: false,
    equipped: false,
    unlocked: false,
    requirement: 'Complete 10 quests',
    requirementProgress: 7,
    requirementMax: 10,
  },
  {
    id: '4',
    name: 'Space Theme',
    cost: 3000,
    icon: '🚀',
    category: 'themes',
    rarity: 'Epic',
    description: 'Play chess among the stars!',
    owned: false,
    equipped: false,
    unlocked: true,
    isLimitedTime: true,
    timeRemaining: '3 days 2h',
  },
  {
    id: '5',
    name: 'Streak Freeze',
    cost: 200,
    icon: '🛡️',
    category: 'powerups',
    rarity: 'Uncommon',
    description: 'Protect your streak for one day',
    owned: false,
    equipped: false,
    unlocked: true,
  },
  {
    id: '6',
    name: 'Dragon Pet',
    cost: 5000,
    icon: '🐉',
    category: 'collectibles',
    rarity: 'Legendary',
    description: 'Your very own dragon companion!',
    owned: false,
    equipped: false,
    unlocked: true,
    isLimitedTime: true,
    timeRemaining: '1 day 5h',
  },
]

const getRarityStyles = (rarity: ItemRarity) => {
  const styles = {
    Common: {
      border: 'border-gray-300',
      bg: 'bg-gray-50',
      badge: 'bg-gray-100 text-gray-700',
      glow: '',
    },
    Uncommon: {
      border: 'border-green-400',
      bg: 'bg-green-50',
      badge: 'bg-green-100 text-green-700',
      glow: 'animate-rarity-glow-rare',
    },
    Rare: {
      border: 'border-blue-400',
      bg: 'bg-blue-50',
      badge: 'bg-blue-100 text-blue-700',
      glow: 'animate-rarity-glow-rare',
    },
    Epic: {
      border: 'border-purple-400',
      bg: 'bg-purple-50',
      badge: 'bg-purple-100 text-purple-700',
      glow: 'animate-rarity-glow-epic',
    },
    Legendary: {
      border: 'border-yellow-400',
      bg: 'bg-yellow-50',
      badge: 'bg-yellow-100 text-yellow-700',
      glow: 'animate-rarity-glow-legendary',
    },
  }
  return styles[rarity]
}

export function StarShopFull() {
  const [activeCategory, setActiveCategory] = useState<ShopItem['category']>('avatars')
  const [playerStars, setPlayerStars] = useState(42)
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [wishlist, setWishlist] = useState<string[]>([])
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [items, setItems] = useState(shopItems)

  const categories = [
    { id: 'avatars', label: 'Avatars', icon: '🎨' },
    { id: 'accessories', label: 'Accessories', icon: '🎭' },
    { id: 'themes', label: 'Themes', icon: '🎨' },
    { id: 'collectibles', label: 'Collectibles', icon: '🃏' },
    { id: 'powerups', label: 'Power-Ups', icon: '⚡' },
    { id: 'premium', label: 'Premium', icon: '🏆' },
  ] as const

  const filteredItems = items.filter(item => item.category === activeCategory)

  const toggleWishlist = (itemId: string) => {
    setWishlist(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handlePurchase = () => {
    if (selectedItem && playerStars >= selectedItem.cost) {
      const newItems = items.map(item =>
        item.id === selectedItem.id
          ? { ...item, owned: true, equipped: true }
          : { ...item, equipped: false }
      )
      setItems(newItems)
      setPlayerStars(playerStars - selectedItem.cost)
      setShowConfirmation(false)
      setShowPreview(false)
      setSelectedItem(null)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with star balance */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400 px-4 py-4 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Crown className="h-8 w-8 text-white" />
            <h1 className="font-heading text-3xl font-bold text-white">Star Shop</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-4 py-2">
            <Star className="h-6 w-6 fill-white text-white" />
            <span className="font-heading text-2xl font-bold text-white">{playerStars}</span>
          </div>
        </div>
      </div>

      {/* Daily Deal Banner */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 px-4 py-3">
        <div className="max-w-6xl mx-auto text-center">
          <p className="font-heading text-lg font-bold text-white">
            Daily Special: Space Theme - 20% Off Today Only! 🚀
          </p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as ShopItem['category'])}
              className={`flex items-center gap-2 rounded-full px-4 py-2 font-heading font-bold transition-all ${
                activeCategory === cat.id
                  ? 'bg-green-500 text-white shadow-lg scale-105'
                  : 'bg-white border-2 border-border text-card-foreground hover:border-green-500'
              }`}
            >
              <span className="text-lg">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      <div className="max-w-6xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map(item => {
            const rarityStyle = getRarityStyles(item.rarity)
            const canAfford = playerStars >= item.cost
            const isWishlisted = wishlist.includes(item.id)

            return (
              <div
                key={item.id}
                className={`relative rounded-2xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${rarityStyle.border} ${rarityStyle.bg} ${rarityStyle.glow}`}
              >
                {/* Limited time badge */}
                {item.isLimitedTime && (
                  <div className="absolute top-2 left-2 right-2 z-10">
                    <div className="bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1">
                      <span>⏰ Limited Edition!</span>
                    </div>
                  </div>
                )}

                {/* Lock overlay */}
                {!item.unlocked && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/40 backdrop-blur">
                    <Lock className="h-12 w-12 text-white mb-2" />
                    <p className="text-xs font-bold text-white text-center px-2">
                      {item.requirement}
                    </p>
                    <div className="mt-2 w-10 h-1 bg-white/30 rounded-full">
                      <div
                        className="h-full bg-white rounded-full"
                        style={{
                          width: `${((item.requirementProgress || 0) / (item.requirementMax || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Item content */}
                <div className="p-4 flex flex-col items-center gap-3">
                  {/* Item icon */}
                  <div className="text-6xl">{item.icon}</div>

                  {/* Item name */}
                  <h3 className="font-heading font-bold text-center text-sm line-clamp-2">
                    {item.name}
                  </h3>

                  {/* Rarity badge */}
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${rarityStyle.badge}`}>
                    {item.rarity}
                  </span>

                  {/* Cost */}
                  <div className="flex items-center gap-1 font-heading font-bold">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className={canAfford ? 'text-yellow-600' : 'text-muted-foreground'}>
                      {item.cost}
                    </span>
                  </div>

                  {/* Owned badge */}
                  {item.owned && (
                    <div className="w-full bg-green-100 text-green-700 text-center py-1 rounded-lg text-xs font-bold">
                      {item.equipped ? 'Equipped ✓' : 'Owned ✓'}
                    </div>
                  )}

                  {/* Timer for limited items */}
                  {item.isLimitedTime && (
                    <div className="text-xs font-bold animate-timer-pulse">
                      {item.timeRemaining}
                    </div>
                  )}

                  {/* Action buttons */}
                  {item.unlocked && (
                    <div className="w-full flex gap-2 mt-2">
                      <button
                        onClick={() => toggleWishlist(item.id)}
                        className="flex-1 p-2 rounded-lg border-2 border-red-300 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <Heart
                          className={`h-4 w-4 mx-auto ${isWishlisted ? 'fill-red-500 text-red-500' : 'text-red-400'}`}
                        />
                      </button>
                      {!item.owned ? (
                        <button
                          onClick={() => {
                            setSelectedItem(item)
                            setShowPreview(true)
                          }}
                          disabled={!canAfford}
                          className="flex-1 bg-orange-500 text-white rounded-lg px-2 py-1 text-xs font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Buy
                        </button>
                      ) : (
                        <button
                          disabled={item.equipped}
                          className="flex-1 bg-green-500 text-white rounded-lg px-2 py-1 text-xs font-bold disabled:opacity-50 transition-colors"
                        >
                          {item.equipped ? 'Using' : 'Equip'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Purchase preview modal */}
      {showPreview && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 animate-preview-slide">
            <div className="flex justify-between items-start mb-4">
              <h2 className="font-heading text-2xl font-bold">{selectedItem.name}</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Preview */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 flex justify-center mb-4">
              <div className="text-8xl">{selectedItem.icon}</div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mb-4">{selectedItem.description}</p>

            {/* Cost and confirmation */}
            <div className="flex items-center gap-2 mb-6 font-heading font-bold text-lg">
              <Star className="h-5 w-5 fill-yellow-500 text-yellow-500" />
              <span>{selectedItem.cost} Stars</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-3 font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={playerStars < selectedItem.cost}
                className="flex-1 bg-orange-500 text-white rounded-lg py-3 font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Buy Now
              </button>
            </div>
          </div>

          {/* Confirmation */}
          {showConfirmation && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70">
              <div className="bg-white rounded-3xl p-8 text-center animate-purchase-pop">
                <p className="font-heading text-2xl font-bold mb-4">
                  Spend {selectedItem.cost} Stars?
                </p>
                <p className="text-muted-foreground mb-6">
                  You'll have {playerStars - selectedItem.cost} Stars left
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirmation(false)}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-3 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePurchase}
                    className="flex-1 bg-green-500 text-white rounded-lg py-3 font-bold hover:bg-green-600"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
