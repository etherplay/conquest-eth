/* eslint-disable */
import {ZERO_ADDRESS} from './utils';
import {Transfer} from '../generated/PlayToken/PlayToken_Contract';
import {handleOwner, updateChainAndReturnTransactionID} from './shared';
import {Owner} from '../generated/schema';

export function handlePlayTokenTransfer(event: Transfer): void {
  updateChainAndReturnTransactionID(event);
  let from: Owner | null;
  if (!event.params.from.equals(ZERO_ADDRESS)) {
    from = handleOwner(event.params.from);
    from.playTokenBalance = from.playTokenBalance.minus(event.params.value);
    from.save();
  }

  if (!event.params.to.equals(ZERO_ADDRESS)) {
    let to = handleOwner(event.params.to);
    to.playTokenBalance = to.playTokenBalance.plus(event.params.value);
    to.save();
  }
}
