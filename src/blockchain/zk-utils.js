//lightweight Zero-Knowledge utilities using native Web Crypto API (dependency free)
//Benefit: no additional dependencies required from zk-snark or other libraries

/**
 * creates a commitment to a vote that can be verified without revealing the vote
 * @param {string} candidateId   ID of the candidate voted for (e.g. 'A', 'B', 'C')
 * @param {string} voterSecret   a secret known only to the voter (using unique voter id)
 * @param {string} salt          a random value to prevent brute force attacks
 * @returns {Promise<{commitment: string, salt: string, proof: Object}>}
 */

//method to create a commitment to a vote that can be verified without revealing the vote
export async function createVoteCommitment(candidateId, voterSecret, salt = null) {
  
    //generate a random salt if not provided (for unique commitment)
  if (!salt) {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    salt = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  //create the commitment by hashing the candidateId, voterSecret, and salt
  const commitment = await hashData(candidateId + voterSecret + salt);
  
  //create a nullifier that proves the voter participated without revealing their vote
  const nullifier = await hashData(voterSecret + salt);
  
  //generate the proof data based on the nullifier
  const proof = {
    nullifier,
    //other additional data to help with verification
    electionId: await hashData("election-" + new Date().toISOString().split('T')[0]),
    timestamp: Date.now(),
    commitmentSalt: salt
  };

  return {
    commitment,
    salt,
    proof
  };
}

/**
 * parameterizes that a commitment matches a claimed vote without revealing the vote to others
 * @param {string} commitment - The original commitment hash
 * @param {string} candidateId - The claimed candidate ID
 * @param {string} voterSecret - The voter's secret
 * @param {string} salt - The salt used in the commitment
 * @returns {Promise<boolean>}
 */
export async function verifyVoteCommitment(commitment, candidateId, voterSecret, salt) {
  //recreate the commitment hash using the provided values
  const recreatedCommitment = await hashData(candidateId + voterSecret + salt);
  
  //compare the recreated commitment with the original
  return commitment === recreatedCommitment;
}

/**
 * creates a zero-knowledge proof that the voter knows the secret without revealing it
 * @param {string} voterSecret - The voter's secret
 * @param {string} commitment - The commitment hash
 * @returns {Promise<{proof: string, publicSignals: string[]}>}
 */

//method to create a zero-knowledge proof that the voter knows the secret without revealing it
//(NOTE: this is a simplified version and not a real zk-SNARK)
export async function createZKProof(voterSecret, commitment) {
  
  //create a hash of specific parts to simulate a proof
  const proofHash = await hashData(`proof-${voterSecret.substring(0, 3)}-${commitment.substring(0, 8)}`);
  
  return {
    proof: proofHash,
    publicSignals: [
      commitment.substring(0, 16),                  //only reveal part of the commitment
      await hashData(voterSecret).substring(0, 10)  //partial hash of the secret
    ]
  };
}

/**
 * verifies that a vote was included in the election without revealing who it was for
 * @param {string} commitment - The vote commitment 
 * @param {Array} allCommitments - All commitments in the blockchain
 * @returns {boolean}
 */
export function verifyVoteInclusion(commitment, allCommitments) {
  //check if the commitment exists in the blockchain
  return allCommitments.includes(commitment);
}

/**
 * helper function to create a SHA-256 hash of data
 * @param {string} data             the data to hash
 * @returns {Promise<string>}       the resulting hash as a hex string
 */

//method to create a SHA-256 hash of data
async function hashData(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * generates a simplified Merkle proof to verify vote inclusion
 * @param {string} commitment           the vote commitment
 * @param {Array} allCommitments       all vote commitments
 * @returns {Object}                   the Merkle proof
 */

//method to generate a simplified Merkle proof to verify vote inclusion
//(NOTE: this is a simplified version and not a real Merkle proof)
export async function generateMerkleProof(commitment, allCommitments) {
  
  //find the index of the commitment in the array
  const index = allCommitments.indexOf(commitment);
  if (index === -1) return null;
  
  //create a simplified proof structure
  const proof = {
    index,
    //create hashes that would be used in a Merkle proof
    siblings: await Promise.all(
      [0, 1, 2].map(async i => {
        return await hashData(`sibling-${i}-${commitment.substring(0, 8)}`);
      })
    ),
    root: await hashData(allCommitments.join('').substring(0, 100))
  };
  
  return proof;
}

/**
 * verifies a Merkle proof to confirm vote inclusion
 * @param {Object} proof            the Merkle proof
 * @param {string} commitment       the vote commitment
 * @param {string} root             the Merkle root
 * @returns {boolean}
 */

//method to verify a Merkle proof to confirm vote inclusion
//(NOTE: this is a simplified version and not a real Merkle proof)
export function verifyMerkleProof(proof, commitment, root) {
  //check if the proof exists and has the expected format
  return (
    proof &&
    proof.index !== undefined &&
    Array.isArray(proof.siblings) &&
    proof.siblings.length > 0 &&
    proof.root === root
  );
} 