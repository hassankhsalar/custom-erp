const toNumber = (value) => {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
};

const deltaFromTransaction = (txn) => {
  const amount = toNumber(txn?.amount);
  if (amount <= 0) return 0;
  if (txn?.added_to_account === true) return -amount;
  if (txn?.added_to_account === false) return amount;
  return 0;
};

const adjustAccountBalance = async (tx, accountId, delta) => {
  if (!accountId || !delta) return;
  await tx.accounts.updateMany({
    where: { id: parseInt(accountId, 10) },
    data: { balance: { increment: delta } },
  });
};

const adjustBankBalance = async (tx, bankAccountId, delta) => {
  if (!bankAccountId || !delta) return;
  await tx.bankAccount.updateMany({
    where: { id: parseInt(bankAccountId, 10) },
    data: { current_balance: { increment: delta } },
  });
};

const adjustCashRegisterBalance = async (tx, cashRegisterId, delta) => {
  if (!cashRegisterId || !delta) return;
  await tx.cashRegister.updateMany({
    where: { id: parseInt(cashRegisterId, 10) },
    data: { cash_in_hand: { increment: delta } },
  });
};

const rollbackTransactions = async (tx, transactions = [], options = {}) => {
  const reverseBalances = options.reverseBalances !== false;
  const deleteRows = options.deleteRows !== false;
  if (!Array.isArray(transactions) || transactions.length === 0) return;

  for (const txn of transactions) {
    const delta = reverseBalances ? deltaFromTransaction(txn) : 0;
    if (reverseBalances && delta !== 0) {
      await adjustAccountBalance(tx, txn.accountId, delta);
      await adjustBankBalance(tx, txn.bankAccountId, delta);
      await adjustCashRegisterBalance(tx, txn.cashRegisterId, delta);
    }
  }

  if (deleteRows) {
    await tx.transactions.deleteMany({
      where: {
        id: { in: transactions.map((txn) => txn.id).filter(Boolean) },
      },
    });
  }
};

const rollbackAndDeleteTransactionsByWhere = async (tx, where, options = {}) => {
  const transactions = await tx.transactions.findMany({
    where,
    select: {
      id: true,
      amount: true,
      added_to_account: true,
      accountId: true,
      bankAccountId: true,
      cashRegisterId: true,
    },
  });
  await rollbackTransactions(tx, transactions, options);
  return transactions.length;
};

module.exports = {
  rollbackTransactions,
  rollbackAndDeleteTransactionsByWhere,
};
