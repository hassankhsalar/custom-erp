const createTransaction = async (prismaClient, data) => {
  const {
    reference,
    createdById,
    accountId,
    bankAccountId = null,
    cashRegisterId = null,
    saleId = null,
    purchaseId = null,
    purpose = null,
    added_to_account = null,
    amount = null,
    payment_method = null,
    current_account_balance = null,
    note = null
  } = data;

  return prismaClient.transactions.create({
    data: {
      reference,
      createdById,
      accountId,
      bankAccountId,
      cashRegisterId,
      saleId,
      purchaseId,
      purpose,
      added_to_account,
      amount,
      payment_method,
      current_account_balance,
      note
    }
  });
};

module.exports = {
  createTransaction
};
