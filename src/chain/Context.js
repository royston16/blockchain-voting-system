
// define global variable interface

import React, { createContext, useState, ReactNode, useContext } from 'react';
import Block from './Blockchain'

const ChainContext = createContext()

export const BlockProvider = ({ myBlocks }) => {
  const [blocks, setBlocks] = useState([
    new Block('Genisis', '12:00:00', 'Canadite0', '9ab0a3600a1eba7002afccb2931ba5e7')
  ]);

  const concatBlock = (voterName, timeOfVote, vote, previousBlockHash) => {
    const block = new Block(voterName, timeOfVote, vote, previousBlockHash);
    setBlocks([...blocks, block])
  }

  return (
    <Context.Provider value={{ blocks, addBlock }}>
      { myBlocks }
    </Context.Provider>
  );
}

export const useBlock = () => useContext(Context);