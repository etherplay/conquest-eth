export type PriorTransactionInfo = {
  from: `0x${string}`;
  hash: `0x${string}`;
  nonce: `0x${string}`;
  broadcastTime: number;
  // TODO
  // expectEvent?: {
  // 	eventABI: AbiEvent;
  // 	startTimeParam?: string;
  // };
};

// ------------------------------------------------------------------------------------------------
// DeltaTime
// ------------------------------------------------------------------------------------------------
export type DeltaTime = {
  type: 'delta-time';
  expiryDelta?: number;
  startTransaction: PriorTransactionInfo;
  delta: number;
};
export type DeltaTimeWithTargetTime = {
  type: 'delta-time-with-target-time';
  expiryDelta?: number;
  startTransaction: PriorTransactionInfo;
  delta: number;
  targetTimeUnlessHigherDelta: number;
};
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// FixedTime
// ------------------------------------------------------------------------------------------------
export type FixedTime = {
  type: 'fixed-time';
  expiryDelta?: number;
  assumedTransaction?: PriorTransactionInfo;
  scheduledTime: number;
};
// ------------------------------------------------------------------------------------------------

// ------------------------------------------------------------------------------------------------
// FixedRound
// ------------------------------------------------------------------------------------------------
export type FixedRound = {
  type: 'fixed-round';
  expiryDelta?: number;
  assumedTransaction?: PriorTransactionInfo;
  scheduledRound: number;
  expectedTime: number;
};

export type Submission = {
  slot: string;
  chainId: string;
  transaction: {
    data: `0x${string}`;
    to: `0x${string}`;
    gas: bigint;
  };
  maxFeePerGasAuthorized: bigint;
  criticalDelta?: number;
  timing: FixedTime | DeltaTime | DeltaTimeWithTargetTime | Omit<FixedRound, 'scheduledRound'>;
  paymentReserve?: {amount: bigint; broadcaster: `0x${string}`};
  onBehalf?: `0x${string}`;
  inClear?: boolean;
};

export type PartialSubmission = {
  slot: string;
  chainId: string;
  transaction: {
    data: `0x${string}`;
    to: `0x${string}`;
    gas: bigint;
  };
  maxFeePerGasAuthorized: bigint;
  criticalDelta?: number;
  timing:
    | Omit<FixedTime, 'assumedTransaction'>
    | Omit<DeltaTime, 'startTransaction'>
    | Omit<DeltaTimeWithTargetTime, 'startTransaction'>
    | Omit<FixedRound, 'scheduledRound' | 'assumedTransaction'>;
  paymentReserve?: {amount: bigint; broadcaster: `0x${string}`};
  onBehalf?: `0x${string}`;
  inClear?: boolean;
};
