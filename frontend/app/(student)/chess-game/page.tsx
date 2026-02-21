// app/(student)/chess-game/page.tsx - Chess Game Invite Page

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { gameAPI, User } from '@/lib/api';
import { Search, UserPlus, Loader2, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ChessGamePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [isLoadingInvites, setIsLoadingInvites] = useState(true);
  const [hasSentInvites, setHasSentInvites] = useState(false);
  const handledInviteIds = useRef<Set<number>>(new Set());

  // Load pending invites on mount
  useEffect(() => {
    loadInvites();
  }, []);

  // Check if user has sent any pending invites
  useEffect(() => {
    const sentInvites = pendingInvites.filter(
      invite => invite.inviter_id === user?.id && invite.status === 'pending'
    );
    setHasSentInvites(sentInvites.length > 0);
  }, [pendingInvites, user?.id]);

  // Search users with debounce
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      // Double-check query length before making API call
      if (searchQuery.length >= 2) {
        searchUsers();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadInvites = async () => {
    try {
      setIsLoadingInvites(true);
      const invites = await gameAPI.getInvites('pending');
      setPendingInvites(invites);
      
      // Also get all invites to mark already-accepted ones as handled
      // (so we don't navigate to old games)
      if (user?.id) {
        const allInvites = await gameAPI.getInvites();
        const alreadyAccepted = allInvites.filter(
          invite => 
            invite.inviter_id === user.id && 
            invite.status === 'accepted' && 
            invite.game_id
        );
        alreadyAccepted.forEach(invite => {
          handledInviteIds.current.add(invite.id);
        });
      }
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setIsLoadingInvites(false);
    }
  };

  const checkForAcceptedInvites = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all invites (not just pending) to check for accepted ones
      const allInvites = await gameAPI.getInvites();
      
      // Find invites where:
      // 1. Current user is the inviter (sent invites)
      // 2. Status is "accepted"
      // 3. Has a game_id
      // 4. We haven't already handled this invite
      const acceptedInvites = allInvites.filter(
        invite => 
          invite.inviter_id === user.id && 
          invite.status === 'accepted' && 
          invite.game_id &&
          !handledInviteIds.current.has(invite.id)
      );

      // If we found a newly accepted invite, navigate to the game
      if (acceptedInvites.length > 0) {
        const acceptedInvite = acceptedInvites[0]; // Take the first one
        handledInviteIds.current.add(acceptedInvite.id);
        toast.success('Your invite was accepted! Starting game...');
        router.push(`/chess-game/${acceptedInvite.game_id}`);
        return; // Exit early since we're navigating
      }

      // Update pending invites list (remove accepted ones)
      const stillPending = allInvites.filter(invite => invite.status === 'pending');
      setPendingInvites(stillPending);
    } catch (error) {
      console.error('Failed to check for accepted invites:', error);
    }
  }, [user?.id, router]);

  // Poll for invite status changes (check every 2 seconds) - only when user has sent invites
  useEffect(() => {
    if (!hasSentInvites || !user?.id) return;

    const pollInterval = setInterval(() => {
      checkForAcceptedInvites();
    }, 2000); // Check every 2 seconds

    return () => clearInterval(pollInterval);
  }, [hasSentInvites, user?.id, checkForAcceptedInvites]);

  const searchUsers = async () => {
    // Prevent API call if query is too short
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await gameAPI.searchUsers(searchQuery.trim());
      setSearchResults(results);
    } catch (error: any) {
      console.error('Failed to search users:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
        query: searchQuery
      });
      // Only show error if it's not a validation error (422)
      if (error.response?.status !== 422) {
        toast.error('Failed to search users');
      } else {
        // Log validation error details
        console.warn('Validation error (422):', error.response?.data);
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInvite = async (inviteeId: number, inviteeName: string) => {
    try {
      await gameAPI.createInvite(inviteeId);
      toast.success(`Invite sent to ${inviteeName}!`);
      setSearchQuery('');
      setSearchResults([]);
      loadInvites(); // Refresh invites list
    } catch (error: any) {
      console.error('Failed to send invite:', error);
      const message = error.response?.data?.detail || 'Failed to send invite';
      toast.error(message);
    }
  };

  const handleAcceptInvite = async (inviteId: number) => {
    try {
      const game = await gameAPI.acceptInvite(inviteId);
      toast.success('Invite accepted! Starting game...');
      router.push(`/chess-game/${game.id}`);
    } catch (error: any) {
      console.error('Failed to accept invite:', error);
      const message = error.response?.data?.detail || 'Failed to accept invite';
      toast.error(message);
      loadInvites(); // Refresh invites list
    }
  };

  const handleRejectInvite = async (inviteId: number) => {
    try {
      await gameAPI.rejectInvite(inviteId);
      toast.success('Invite rejected');
      loadInvites(); // Refresh invites list
    } catch (error: any) {
      console.error('Failed to reject invite:', error);
      toast.error('Failed to reject invite');
    }
  };

  // Filter out invites where current user is the inviter (only show received invites)
  const receivedInvites = pendingInvites.filter(
    invite => invite.invitee_id === user?.id && invite.status === 'pending'
  );

  // Filter out invites where current user is the invitee (only show sent invites)
  const sentInvites = pendingInvites.filter(
    invite => invite.inviter_id === user?.id && invite.status === 'pending'
  );

  return (
    <div className="mx-auto max-w-4xl pt-6">
      {/* Search Section */}
      <section className="mb-6">
        <div className="rounded-3xl border-2 border-orange-200 bg-card shadow-sm">
          <div className="bg-gradient-to-r from-orange-400 to-pink-500 px-5 py-4">
            <h2 className="font-heading text-lg font-bold text-white">
              Search Friends
            </h2>
          </div>
          <div className="p-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by username or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-2 border-border bg-background px-10 py-3 font-heading text-base focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between rounded-xl border-2 border-border bg-background p-4 transition-all hover:border-orange-300 hover:shadow-md"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-pink-500 text-xl font-bold text-white">
                        {result.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-heading font-bold text-card-foreground">
                          {result.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{result.username} • Level {result.level} • Rating {result.rating}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInvite(result.id, result.full_name)}
                      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-400 to-pink-500 px-4 py-2 font-heading font-bold text-white transition-all hover:shadow-lg hover:scale-105"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite
                    </button>
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
              <div className="mt-4 text-center text-muted-foreground">
                <p className="font-heading">No users found</p>
                <p className="text-sm">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Received Invites */}
      {receivedInvites.length > 0 && (
        <section className="mb-6">
          <div className="rounded-3xl border-2 border-green-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-white">
                Game Invites Received ({receivedInvites.length})
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {receivedInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-xl border-2 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-xl font-bold text-white">
                      {invite.inviter?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-card-foreground">
                        {invite.inviter?.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        @{invite.inviter?.username} wants to play chess with you!
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(invite.id)}
                      className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 px-4 py-2 font-heading font-bold text-white transition-all hover:shadow-lg hover:scale-105"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleRejectInvite(invite.id)}
                      className="flex items-center gap-2 rounded-lg border-2 border-red-300 bg-white px-4 py-2 font-heading font-bold text-red-600 transition-all hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Sent Invites */}
      {sentInvites.length > 0 && (
        <section className="mb-6">
          <div className="rounded-3xl border-2 border-blue-200 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-blue-400 to-cyan-500 px-5 py-4">
              <h2 className="font-heading text-lg font-bold text-white">
                Pending Invites Sent ({sentInvites.length})
              </h2>
            </div>
            <div className="p-5 space-y-3">
              {sentInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 text-xl font-bold text-white">
                      {invite.invitee?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-heading font-bold text-card-foreground">
                        {invite.invitee?.full_name || 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Waiting for response...
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg bg-blue-100 px-4 py-2">
                    <span className="font-heading text-sm font-bold text-blue-700">
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State */}
      {receivedInvites.length === 0 && sentInvites.length === 0 && searchQuery.length < 2 && (
        <section className="mb-6">
          <div className="rounded-3xl border-2 border-border bg-card p-12 text-center shadow-sm">
            <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="font-heading text-xl font-bold text-card-foreground mb-2">
              No Active Invites
            </p>
            <p className="text-muted-foreground">
              Search for friends above to start a game!
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
