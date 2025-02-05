import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, Check, Users, DollarSign, History, Table } from 'lucide-react';

interface User {
  id: string;
  email: string;
  balance: number;
}

interface PokerTable {
  id: string;
  name: string;
  min_buy_in: number;
  max_buy_in: number;
  small_blind: number;
  big_blind: number;
  max_players: number;
  status: string;
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'poker'>('users');
  const [newTable, setNewTable] = useState({
    name: '',
    min_buy_in: 100,
    max_buy_in: 1000,
    small_blind: 1,
    big_blind: 2,
    max_players: 9
  });
  const [tables, setTables] = useState<PokerTable[]>([]);

  useEffect(() => {
    checkAdminAccess();
    loadUsers();
    loadTables();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.email !== 'dogesman098@gmail.com') {
      setError('Unauthorized access');
      setLoading(false);
      setIsAdmin(false);
      return false;
    }
    setIsAdmin(true);
    return true;
  };

  const loadUsers = async () => {
    try {
      const isAdmin = await checkAdminAccess();
      if (!isAdmin) return;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          balance,
          auth.users (
            email
          )
        `)
        .order('balance', { ascending: false });

      if (profilesError) throw profilesError;

      const formattedUsers = profiles.map((profile: any) => ({
        id: profile.id,
        email: profile.users?.email || 'Unknown',
        balance: profile.balance
      }));

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    try {
      const { data, error } = await supabase
        .from('poker_tables')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTables(data || []);
    } catch (error) {
      console.error('Error loading tables:', error);
    }
  };

  const updateBalance = async () => {
    try {
      if (!selectedUser || !amount) return;
      
      const isAdmin = await checkAdminAccess();
      if (!isAdmin) return;

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: selectedUser,
          amount: amount,
          game_type: 'admin',
          details: {
            type: 'admin_adjustment',
            timestamp: new Date().toISOString()
          }
        });

      if (transactionError) throw transactionError;

      setMessage('Balance updated successfully');
      loadUsers();
      setAmount(0);
      setSelectedUser(null);

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating balance:', error);
      setError('Failed to update balance');
    }
  };

  const createPokerTable = async () => {
    try {
      const { error } = await supabase
        .from('poker_tables')
        .insert([newTable]);

      if (error) throw error;

      setMessage('Poker table created successfully');
      loadTables();
      setNewTable({
        name: '',
        min_buy_in: 100,
        max_buy_in: 1000,
        small_blind: 1,
        big_blind: 2,
        max_players: 9
      });

      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error creating table:', error);
      setError('Failed to create poker table');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-6 rounded-lg max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Error</h2>
          </div>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-red-500/10 border border-red-500 text-red-500 p-6 rounded-lg max-w-md mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Unauthorized</h2>
          </div>
          <p>You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Admin Panel
            </h1>
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'users'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab('poker')}
                className={`px-4 py-2 rounded-lg ${
                  activeTab === 'poker'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                Poker Tables
              </button>
            </div>
          </div>

          {message && (
            <div className="mb-4 p-4 bg-green-500/10 border border-green-500 text-green-500 rounded-lg flex items-center gap-2">
              <Check className="w-5 h-5" />
              {message}
            </div>
          )}

          {activeTab === 'users' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  User List
                </h2>
                <div className="bg-gray-700 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-600">
                          <th className="p-4 text-gray-300">Email</th>
                          <th className="p-4 text-gray-300">Balance</th>
                          <th className="p-4 text-gray-300">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-t border-gray-600">
                            <td className="p-4 text-white">{user.email}</td>
                            <td className="p-4 text-white">${user.balance.toFixed(2)}</td>
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedUser(user.id)}
                                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Balance Adjustment
                </h2>
                <div className="bg-gray-700 p-6 rounded-lg">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Selected User
                    </label>
                    <div className="text-white bg-gray-600 p-3 rounded">
                      {users.find(u => u.id === selectedUser)?.email || 'No user selected'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount (use negative for deductions)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-gray-600 text-white p-3 rounded"
                      placeholder="Enter amount..."
                    />
                  </div>

                  <button
                    onClick={updateBalance}
                    disabled={!selectedUser || !amount}
                    className={`w-full py-3 rounded-lg font-bold ${
                      !selectedUser || !amount
                        ? 'bg-gray-600 text-gray-400'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                  >
                    Update Balance
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  Create Poker Table
                </h2>
                <div className="bg-gray-700 p-6 rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Table Name
                      </label>
                      <input
                        type="text"
                        value={newTable.name}
                        onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                        className="w-full bg-gray-600 text-white p-3 rounded"
                        placeholder="Enter table name..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Min Buy-in
                        </label>
                        <input
                          type="number"
                          value={newTable.min_buy_in}
                          onChange={(e) => setNewTable({ ...newTable, min_buy_in: Number(e.target.value) })}
                          className="w-full bg-gray-600 text-white p-3 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Max Buy-in
                        </label>
                        <input
                          type="number"
                          value={newTable.max_buy_in}
                          onChange={(e) => setNewTable({ ...newTable, max_buy_in: Number(e.target.value) })}
                          className="w-full bg-gray-600 text-white p-3 rounded"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Small Blind
                        </label>
                        <input
                          type="number"
                          value={newTable.small_blind}
                          onChange={(e) => setNewTable({ ...newTable, small_blind: Number(e.target.value) })}
                          className="w-full bg-gray-600 text-white p-3 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Big Blind
                        </label>
                        <input
                          type="number"
                          value={newTable.big_blind}
                          onChange={(e) => setNewTable({ ...newTable, big_blind: Number(e.target.value) })}
                          className="w-full bg-gray-600 text-white p-3 rounded"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Max Players
                      </label>
                      <input
                        type="number"
                        value={newTable.max_players}
                        onChange={(e) => setNewTable({ ...newTable, max_players: Number(e.target.value) })}
                        className="w-full bg-gray-600 text-white p-3 rounded"
                        min="2"
                        max="9"
                      />
                    </div>
                    <button
                      onClick={createPokerTable}
                      disabled={!newTable.name}
                      className={`w-full py-3 rounded-lg font-bold ${
                        !newTable.name
                          ? 'bg-gray-600 text-gray-400'
                          : 'bg-green-500 text-white hover:bg-green-600'
                      }`}
                    >
                      Create Table
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Table className="w-5 h-5" />
                  Active Tables
                </h2>
                <div className="space-y-4">
                  {tables.map((table) => (
                    <div key={table.id} className="bg-gray-700 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-white mb-2">{table.name}</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
                        <div>
                          <p>Min Buy-in: ${table.min_buy_in}</p>
                          <p>Max Buy-in: ${table.max_buy_in}</p>
                        </div>
                        <div>
                          <p>Small Blind: ${table.small_blind}</p>
                          <p>Big Blind: ${table.big_blind}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-300">
                        <p>Max Players: {table.max_players}</p>
                        <p>Status: {table.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}