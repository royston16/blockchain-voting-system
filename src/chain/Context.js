
//define the global variable interface for the blockchain
import React, { createContext, useState, ReactNode, useContext } from 'react';
import Block from './Blockchain'

//create the context for the blockchain
const ChainContext = createContext()

//provider for the blockchain
export const BlockProvider = ({ myBlocks }) => {
  const [blocks, setBlocks] = useState([
    new Block('Genisis', '12:00:00', 'Canadite0', '9ab0a3600a1eba7002afccb2931ba5e7')
  ]);

  //method to concatenate the block to the blockchain
  const concatBlock = (voterName, timeOfVote, vote, previousBlockHash) => {
    const block = new Block(voterName, timeOfVote, vote, previousBlockHash);
    setBlocks([...blocks, block])
  }

  //return the blockchain
  return (
    <Context.Provider value={{ blocks, addBlock }}>
      { myBlocks }
    </Context.Provider>
  );
}

//method to use the blockchain
export const useBlock = () => useContext(Context);