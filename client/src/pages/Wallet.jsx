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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">

      {/* Header */}
      <div className="mb-10 text-center relative">
        <h1 className="text-5xl font-black tracking-tight text-[#0f172a] mb-2 uppercase italic">
          My <span className="text-[#695f02] relative">
            Wallet
            <span className="absolute -bottom-1 left-0 w-full h-3 bg-[#fef08a] -z-10 rotate-[-1deg]"></span>
          </span>
        </h1>
        <p className="text-[#50616b] font-bold">Manage your funds and view your transaction history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 items-start">

        {/* Balance Card - Sticky Note Style */}
        <div className="lg:col-span-4 brand-surface p-8 bg-[#fef08a] rotate-[-1deg] shadow-[6px_6px_0px_#0f172a]">
          <div className="mb-6">
            <p className="text-xs font-black text-[#695f02] uppercase tracking-[0.2em] mb-1">
              Current Balance
            </p>
            <p className="text-6xl font-black tracking-tighter text-[#0f172a]">
              ${balance.toFixed(2)}
            </p>
          </div>
          <div className="pt-4 border-t-2 border-[#0f172a]/10 space-y-1">
            <p className="text-[10px] font-black text-[#0f172a]/40 uppercase tracking-widest flex justify-between">
              <span>Account</span>
              <span>{user.username}</span>
            </p>
            <p className="text-[10px] font-black text-[#0f172a]/40 uppercase tracking-widest flex justify-between">
              <span>Tier</span>
              <span>{user.role}</span>
            </p>
          </div>
        </div>

        {/* Action Form */}
        <div className="lg:col-span-8 brand-surface p-8 relative">
          <div className="absolute -top-3 -right-3 bg-white border-2 border-[#0f172a] px-3 py-1 rotate-[2deg] shadow-sm font-black text-[10px] uppercase">
            Quick Actions
          </div>
          
          {/* Tab switcher */}
          {canWithdraw && (
            <div className="flex gap-4 mb-8">
              <button
                onClick={() => { setActionType('TopUp'); setFormError(''); setFormSuccess(''); }}
                className={`flex-1 brand-button-neutral text-sm flex items-center justify-center gap-2 ${
                  actionType === 'TopUp' ? 'bg-[#fef08a] scale-[1.02]' : 'opacity-60'
                }`}
              >
                💳 Add Funds
              </button>
              <button
                onClick={() => { setActionType('Withdrawal'); setFormError(''); setFormSuccess(''); }}
                className={`flex-1 brand-button-neutral text-sm flex items-center justify-center gap-2 ${
                  actionType === 'Withdrawal' ? 'bg-[#e0f2fe] scale-[1.02]' : 'opacity-60'
                }`}
              >
                🏦 Withdraw
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#0f172a] uppercase tracking-widest">
                  Amount (USD)
                </label>
                <div className="relative group">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0f172a] font-black">$</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="brand-input pl-8 font-black text-lg focus:rotate-[0.5deg]"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-black text-[#0f172a] uppercase tracking-widest">
                  Description <span className="opacity-30">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={actionType === 'TopUp' ? 'e.g. Project funds' : 'e.g. Monthly payout'}
                  className="brand-input font-medium focus:rotate-[-0.5deg]"
                />
              </div>
            </div>

            {formError && (
              <div className="bg-[#fee2e2] border-2 border-[#991b1b] p-4 font-bold text-xs text-[#991b1b] rotate-[0.5deg]">
                ⚠️ ERROR: {formError}
              </div>
            )}
            {formSuccess && (
              <div className="bg-[#dcfce7] border-2 border-[#166534] p-4 font-bold text-xs text-[#166534] rotate-[-0.5deg]">
                ✨ SUCCESS: {formSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="brand-button-primary w-full text-base py-4"
            >
              {submitting
                ? 'Processing...'
                : actionType === 'TopUp'
                ? 'Confirm Top Up'
                : 'Confirm Withdrawal'}
            </button>
          </form>
        </div>
      </div>

      {/* Transaction History */}
      <div className="brand-surface overflow-hidden">
        <div className="brand-hero px-8 py-5 flex items-center justify-between border-b-2 border-[#0f172a]">
          <h3 className="text-xl font-black text-[#0f172a] uppercase italic">Transaction History</h3>
          <div className="h-2 w-24 bg-[#0f172a]/10 rounded-full"></div>
        </div>

        {transactions.length === 0 ? (
          <div className="px-8 py-20 text-center font-bold text-[#50616b] bg-white italic">
            "The ledger is empty... for now."
          </div>
        ) : (
          <div className="divide-y-2 divide-[#0f172a]/5">
            {transactions.map((txn) => {
              const style = TXN_TYPE_STYLES[txn.type] || {
                bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', label: txn.type, sign: '',
              };
              const isCredit = style.sign === '+';
              return (
                <div key={txn.txn_id} className="flex items-center justify-between px-8 py-6 hover:bg-[#f7f9fb] transition-colors group">
                  <div className="flex items-center gap-6">
                    <div className={`h-14 w-14 brand-surface flex items-center justify-center text-2xl rotate-[3deg] group-hover:rotate-[-3deg] transition-transform ${isCredit ? 'bg-[#dcfce7]' : 'bg-[#fee2e2]'}`}>
                      {txn.type === 'TopUp' ? '💳' : txn.type === 'Earning' ? '💼' : txn.type === 'Refund' ? '↩️' : txn.type === 'OrderPayment' ? '🛒' : '🏦'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-[#0f172a] uppercase tracking-tight">{style.label}</p>
                        {txn.order_id && (
                          <span className="text-[10px] font-black bg-[#e0f2fe] px-2 py-0.5 border border-[#0f172a] rounded shadow-sm">
                            #{txn.order_id}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-[#50616b] mt-1 italic">
                        {txn.description || 'General transaction'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-black tracking-tighter ${isCredit ? 'text-[#166534]' : 'text-[#991b1b]'}`}>
                      {style.sign}${Math.abs(Number(txn.amount)).toFixed(2)}
                    </p>
                    <p className="text-[10px] font-black text-[#0f172a]/30 uppercase tracking-[0.2em] mt-1">
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
