import React from 'react';
import TransferList from './TransferList';

const FactoryToStore = () => {
  return <TransferList fromType="factory" toType="store" title="Factory to Store Transfers" />;
};

export default FactoryToStore;
