import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js';
import BN from 'bn.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { OpenBookV2Client } from '..';
import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

export const SideUtils = {
  Bid: { bid: {} },
  Ask: { ask: {} },
};

export const PlaceOrderTypeUtils = {
  Limit: { limit: {} },
  ImmediateOrCancel: { immediateOrCancel: {} },
  FillOrKill: { fillOrKill: {} },
  PostOnly: { postOnly: {} },
  Market: { market: {} },
  PostOnlySlide: { postOnlySlide: {} },
};

export const SelfTradeBehaviorUtils = {
  DecrementTake: { decrementTake: {} },
  CancelProvide: { cancelProvide: {} },
  AbortTransaction: { abortTransaction: {} },
};

///
/// numeric helpers
///
export const U64_MAX_BN = new BN('18446744073709551615');
export const I64_MAX_BN = new BN('9223372036854775807').toTwos(64);
export const ORDER_FEE_UNIT: BN = new BN(1e6);

export function bpsToDecimal(bps: number): number {
  return bps / 10000;
}

export function percentageToDecimal(percentage: number): number {
  return percentage / 100;
}

export function toNative(uiAmount: number, decimals: number): BN {
  return new BN((uiAmount * Math.pow(10, decimals)).toFixed(0));
}

export function toUiDecimals(nativeAmount: number, decimals: number): number {
  return nativeAmount / Math.pow(10, decimals);
}

///

///
/// web3js extensions
///

/**
 * Get the address of the associated token account for a given mint and owner
 *
 * @param mint                     Token mint account
 * @param owner                    Owner of the new account
 * @param allowOwnerOffCurve       Allow the owner account to be a PDA (Program Derived Address)
 * @param programId                SPL Token program account
 * @param associatedTokenProgramId SPL Associated Token program account
 *
 * @return Address of the associated token account
 */
export async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = true,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID,
): Promise<PublicKey> {
  if (!allowOwnerOffCurve && !PublicKey.isOnCurve(owner.toBuffer()))
    throw new Error('TokenOwnerOffCurve!');

  const [address] = await PublicKey.findProgramAddress(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId,
  );

  return address;
}

export async function createAssociatedTokenAccountIdempotentInstruction(
  payer: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
): Promise<TransactionInstruction> {
  const account = await getAssociatedTokenAddress(mint, owner);
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      {
        pubkey: SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    data: Buffer.from([0x1]),
  });
}

export function initReadOnlyOpenbookClient(): OpenBookV2Client {
  const conn = new Connection(process.env.SOL_RPC_URL!);
  const stubWallet = new Wallet(Keypair.generate());
  const provider = new AnchorProvider(conn, stubWallet, {});
  return new OpenBookV2Client(provider);
}

export function initOpenbookClient(): OpenBookV2Client {
  const conn = new Connection(process.env.SOL_RPC_URL!, 'processed');
  const wallet = new Wallet(
    Keypair.fromSecretKey(Uint8Array.from(JSON.parse(process.env.KEYPAIR!))),
  );
  const provider = new AnchorProvider(conn, wallet, {});
  return new OpenBookV2Client(provider, undefined, {
    prioritizationFee: 10_000,
  });
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
