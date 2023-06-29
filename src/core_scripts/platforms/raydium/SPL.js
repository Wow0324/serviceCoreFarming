const {
    createAssociatedTokenAccountInstruction, createCloseAccountInstruction, createInitializeAccountInstruction,
    createInitializeMintInstruction, createMintToInstruction, createTransferInstruction,
  } = require("@solana/spl-token");
  const {
    Keypair, SystemProgram, TransactionInstruction,
  } = require("@solana/web3.js");
  const BN = require("bn.js");
  
  const { getATAAddress } = require("./Pda");
  const {parseBigNumberish} = require("./bignumber");

  const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
  const { SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } = require("@solana/web3.js");
  
  const lo = require('@solana/buffer-layout');
  const { SPL_ACCOUNT_LAYOUT } = require("./Layout");
  
  const Addresses = require('../../../core_scripts/config/addresses.json');
const { PublicKey } = require("@solana/web3.js/lib/index.cjs");

  class Spl {
    static getAssociatedTokenAccount({ mint, owner }) {
      return getATAAddress(owner, mint).publicKey
    }
  
    static makeCreateAssociatedTokenAccountInstruction({
      mint,
      associatedAccount,
      owner,
      payer
    }) {
      return createAssociatedTokenAccountInstruction(
        payer,
        associatedAccount,
        owner,
        mint,
      );
    }
  
    static async makeCreateWrappedNativeAccountInstructions({
      connection,
      owner,
      payer,
      amount
    }) {
      const instructions = [];
  
      const balanceNeeded = await connection.getMinimumBalanceForRentExemption(SPL_ACCOUNT_LAYOUT.span);
  
      // Create a new account
      const lamports = parseBigNumberish(amount).add(new BN(balanceNeeded));
      const newAccount = Keypair.generate();
      instructions.push(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: newAccount.publicKey,
          lamports: lamports.toNumber(),
          space: SPL_ACCOUNT_LAYOUT.span,
          programId: TOKEN_PROGRAM_ID,
        }),
      );
    
      var mintPubkey = new PublicKey(Addresses.RaydiumWSOL);
      instructions.push(
        this.makeInitAccountInstruction({
          mint: mintPubkey,
          tokenAccount: newAccount.publicKey,
          owner
        }),
      );
      
  
      return {
        address: { newAccount: newAccount.publicKey },
        innerTransaction: {
          instructions,
          signers: [newAccount]
        }
      }
    }
  
    static async insertCreateWrappedNativeAccount({
      connection,
      owner,
      payer,
      amount,
      instructions,
      signers
    }) {
      const ins = await this.makeCreateWrappedNativeAccountInstructions({
        connection,
        owner,
        payer,
        amount
      });
  
      instructions.push(...ins.innerTransaction.instructions);
      signers.push(...ins.innerTransaction.signers);
      return ins.address.newAccount
    }
  
    static makeInitMintInstruction({
      mint,
      decimals,
      mintAuthority,
      freezeAuthority = null
    }) {
      return createInitializeMintInstruction(mint, decimals, mintAuthority, freezeAuthority);
    }
  
    static makeMintToInstruction({
      mint,
      dest,
      authority,
      amount,
      multiSigners = []
    }) {
      return createMintToInstruction(mint, dest, authority, BigInt(String(amount)), multiSigners);
    }
  
    static makeInitAccountInstruction({
      mint,
      tokenAccount,
      owner
    }) {
      return createInitializeAccountInstruction(tokenAccount, mint, owner);
    }
  
    static makeTransferInstruction({
      source,
      destination,
      owner,
      amount,
      multiSigners = []
    }) {
     
      return createTransferInstruction(
        source,
        destination,
        owner,
        BigInt(String(amount)),
        multiSigners
      );
    }
  
    static makeCloseAccountInstruction({
      tokenAccount,
      owner,
      payer,
      multiSigners = []
    }) {
      return createCloseAccountInstruction(tokenAccount, payer, owner, multiSigners);
    }
  
    static createInitAccountInstruction(programId, mint, account, owner) {
      const keys = [{
        pubkey: account,
        isSigner: false,
        isWritable: true
      }, {
        pubkey: mint,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: owner,
        isSigner: false,
        isWritable: false
      }, {
        pubkey: SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false
      }];
      const dataLayout = lo.u8('instruction');
      const data = Buffer.alloc(dataLayout.span);
      dataLayout.encode(1, data);
      return new TransactionInstruction({
        keys,
        programId,
        data
      });
    }
  }
  exports.Spl = Spl;
  