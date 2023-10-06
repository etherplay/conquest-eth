/* eslint-disable */
import {ZERO_ADDRESS} from './utils';
import {AllianceLink} from '../generated/AllianceRegistry/AllianceRegistry_Contract';
import {IAlliance_Contract} from '../generated/AllianceRegistry/IAlliance_Contract';
import {handleOwner, updateChainAndReturnTransactionID} from './shared';
import {Alliance, Owner, AllianceOwnerPair} from '../generated/schema';
import {store} from '@graphprotocol/graph-ts';

function setCharAt(str: string, index: i32, char: string): string {
  if (index > str.length - 1) return str;
  return str.substr(0, index) + char + str.substr(index + 1);
}
function normalize(strValue: string): string {
  if (strValue.length === 1 && strValue.charCodeAt(0) === 0) {
    return '';
  } else {
    for (let i = 0; i < strValue.length; i++) {
      if (strValue.charCodeAt(i) === 0) {
        strValue = setCharAt(strValue, i, '\ufffd'); // graph-node db does not support string with '\u0000'
      }
    }
    return strValue;
  }
}

export function handleAllianceLink(event: AllianceLink): void {
  let allianceID = event.params.alliance.toHexString();
  let allianceEntity = Alliance.load(allianceID);
  if (!allianceEntity) {
    allianceEntity = new Alliance(allianceID);

    let allianceContract = IAlliance_Contract.bind(event.params.alliance);
    let frontendURI = allianceContract.try_frontendURI();
    if (!frontendURI.reverted) {
      allianceEntity.frontendURI = normalize(frontendURI.value);
    }
    allianceEntity.save();
  }

  let owner = handleOwner(event.params.player);
  let allianceOwnerPairID = allianceID + '_' + owner.id;
  let allianceOwnerPairEntity = AllianceOwnerPair.load(allianceOwnerPairID);

  if (event.params.joining) {
    if (!allianceOwnerPairEntity) {
      allianceOwnerPairEntity = new AllianceOwnerPair(allianceOwnerPairID);
      allianceOwnerPairEntity.owner = owner.id;
      allianceOwnerPairEntity.alliance = allianceID;
      allianceOwnerPairEntity.save();
    } else {
      // ERROR
    }
  } else {
    if (allianceOwnerPairEntity) {
      store.remove('AllianceOwnerPair', allianceOwnerPairID);
    } else {
      // ERROR
    }
  }
}
