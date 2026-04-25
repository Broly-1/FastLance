import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/useAuth';

const API = 'http://localhost:3000';

const TXN_TYPE_STYLES = {
  TopUp:        { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Top-Up',        sign: '+' },
  Earning:      { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Earning',       sign: '+' },
  Refund:       { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', label: 'Refund',        sign: '+' },
  OrderPayment: { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Order Payment', sign: '-' },
  Withdrawal:   { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    label: 'Withdrawal',    sign: '-' },
};

export default function Wallet() {
  const { user } = useAuth();

  const [balance, setBalance]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  // Form state
  const [amount, setAmount]             = useState('');
  const [description, setDescription]  = useState('');
  const [actionType, setActionType]     = useState('TopUp'); // 'TopUp' | 'Withdrawal'
  const [submitting, setSubmitting]     = useState(false);
  const [formError, setFormError]       = useState('');
  const [formSuccess, setFormSuccess]   = useState('');

  const fetchWalletData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [balRes, txnRes] = await Promise.all([
        fetch(`${API}/api/wallet/user/${user.id}/balance`),
        fetch(`${API}/api/wallet/user/${user.id}`),
      ]);
      if (!balRes.ok || !txnRes.ok) throw new Error('Failed to load wallet data.');
      const balData = await balRes.json();
      const txnData = await txnRes.json();
      setBalance(Number(balData.wallet_balance));
      setTransactions(txnData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setFormError('Please enter a valid amount greater than $0.');
      return;
    }
    if (actionType === 'Withdrawal' && numAmount > balance) {
      setFormError(`Insufficient balance. Your current balance is $${balance.toFixed(2)}.`);
      return;
    }

    // For withdrawals the balance delta must be negative
    const delta = actionType === 'Withdrawal' ? -numAmount : numAmount;

    try {
      setSubmitting(true);
      const res = await fetch(`${API}/api/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          amount: delta,
          type: actionType,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Transaction failed.');
      }
      setFormSuccess(
        actionType === 'TopUp'
          ? `Successfully added $${numAmount.toFixed(2)} to your wallet!`
          : `Withdrawal of $${numAmount.toFixed(2)} requested!`
      );
      setAmount('');
      setDescription('');
      await fetchWalletData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const canWithdraw = user?.role === 'Seller' || user?.role === 'Both';

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600 mb-1">
          My Wallet
        </h1>
        <p className="text-gray-500">Manage your funds and view your transaction history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">

        {/* Balance Card */}
        <div className="md:col-span-1 relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 p-6 text-white shadow-lg">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
          <p className="text-sm font-medium text-indigo-200 uppercase tracking-widest mb-2 relative z-10">
            Current Balance
          </p>
          <p className="text-5xl font-black tracking-tight relative z-10">
            ${balance.toFixed(2)}
          </p>
          <p className="mt-3 text-xs text-indigo-200 relative z-10">
            {user.username} · {user.role}
          </p>
        </div>

        {/* Action Form */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Tab switcher — only shown when both options are available */}
          {canWithdraw && (
            <div className="flex gap-2 mb-5">
              <button
                onClick={() => { setActionType('TopUp'); setFormError(''); setFormSuccess(''); }}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition border ${
                  actionType === 'TopUp'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                💳 Add Funds
              </button>
              <button
                onClick={() => { setActionType('Withdrawal'); setFormError(''); setFormSuccess(''); }}
                className={`flex-1 rounded-xl py-2 text-sm font-semibold transition border ${
                  actionType === 'Withdrawal'
                    ? 'bg-purple-600 text-white border-purple-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
                }`}
              >
                🏦 Withdraw
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount (USD)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="brand-input pl-7"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={actionType === 'TopUp' ? 'e.g. Funds for new project' : 'e.g. Monthly payout'}
                className="brand-input"
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                {formError}
              </p>
            )}
            {formSuccess && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                {formSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                actionType === 'TopUp'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              {submitting
                ? 'Processing...'
                : actionType === 'TopUp'
                ? 'Add Funds'
                : 'Request Withdrawal'}
            </button>
          </form>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-800">Transaction History</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-500">
            No transactions yet. Add funds to get started!
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {transactions.map((txn) => {
              const style = TXN_TYPE_STYLES[txn.type] || {
                bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: txn.type, sign: '',
              };
              const isCredit = style.sign === '+';
              return (
                <div key={txn.txn_id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg border ${style.bg} ${style.border}`}>
                      {txn.type === 'TopUp' ? '💳' : txn.type === 'Earning' ? '💼' : txn.type === 'Refund' ? '↩️' : txn.type === 'OrderPayment' ? '🛒' : '🏦'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{style.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {txn.description || 'No description'}
                        {txn.order_id ? ` · Order #${txn.order_id}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-base font-bold ${isCredit ? 'text-green-600' : 'text-red-600'}`}>
                      {style.sign}${Math.abs(Number(txn.amount)).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(txn.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
