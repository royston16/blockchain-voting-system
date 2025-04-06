import { useState, useEffect } from 'react'
import BlockchainInfo from './BlockchainInfo'

export default function BlockchainVerify({ votes }) {
  const [load, setLoad] = useState(true);
  const [loadingWords, setLoadingWords] = useState(null);
  const [showChainData, setShowChainData] = useState(false);
  const [validation, setValidation] = useState(false)

  useEffect(() => {
    setTimeout(() => {
        setLoadingWords("Validation or invalidation complete see results below");
        setLoad(false);
        setShowChainData(true);
    }, 2000);

    // actually check the chain now to see what data you should display
    let isValid = true;
    for(let i = window.allBlocks.length - 1; i > 0; i--)
    {
      if(window.allBlocks[i].getPreviousBlockHash() === window.allBlocks[i-1].getCurrentBlockHash())
      {
        console.log("checked1")
      }
      else
      {
        // chain invalid
        isValid = false;
      }
    }
    setValidation(isValid);

  }, [])

  let loadingStatus;
  if(load)
  {
    loadingStatus = (
      <div className="">
        <div className=""></div>
        <p>Loading... Chain is checking validation</p>
      </div>
    )
  }
  else
  {
    loadingStatus = (
      <div className="">
        <div className=""></div>
        <p>{loadingWords}</p>
      </div>
    )
  }
  let chainData;
  if(window.allBlocks.length === 0)
  {
    chainData = (
        <span>No votes cast so chain not established</span>
    )
  }
  else
  {
    if(showChainData)
    {
      chainData = (
        <div>
          <span class="numBlocksSpan">Number of Blocks: {window.allBlocks.length}</span>
          <ul>
          {window.allBlocks.map((block, i) => (
            <li key={i} class="blockLi">
              <div class="blockHashInfo">
                Block {i + 1} - Previous Hash: {block.getPreviousBlockHash()} <br></br>
                Block {i + 1} - Block Hash: {block.getCurrentBlockHash()} 
              </div>
              <hr class="hrDivider"></hr>
            </li>
          ))}
          </ul>
        </div>
        
      )
    }
    else
    {
    chainData = (
      <div>Loading...</div>
    )
    }
  }

  let validationDiv;
  if(showChainData)
  {
    if(validation)
    {
      validationDiv = (
        <div>Chain has been validated!</div>
      )
    }
    else
    {
      validationDiv = (
        <div>Chain is invalid check for breaches!</div>
      )
    }
  }
  else
  {
    validationDiv = (
      <div>Chain is currently validating</div>
    )
  }


  return (
    <div>
      <BlockchainInfo />
      <div className="card">
        {loadingStatus}
      </div>
      <div className='card'>
        {chainData}
        <div>
            <span>Validation Status... </span>
            {validationDiv}
        </div>
      </div>
    </div>
  )
}