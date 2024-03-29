import { network } from 'app/containers/BlockChainProvider/network';
import { MergedProposal } from 'app/hooks/useProposalList';
import { bignumber } from 'mathjs';
import React, { useEffect, useMemo, useState } from 'react';
import { ProposalState } from 'types/Proposal';
import { kFormatter } from 'utils/helpers';

interface IQuorumDetailsProps {
  proposal?: MergedProposal;
  state: ProposalState;
}

export const QuorumDetails: React.FC<IQuorumDetailsProps> = ({
  proposal,
  state,
}) => {
  const [loading, setLoading] = useState(true);
  const [totalVotingPower, setTotalVotingPower] = useState('0');

  useEffect(() => {
    if (proposal?.startBlock && proposal?.startTime) {
      setLoading(true);
      network
        .call('staking', 'getPriorTotalVotingPower', [
          proposal.startBlock,
          proposal.startTime,
        ])
        .then(response => {
          setTotalVotingPower(response as string);
          setLoading(false);
        });
    }
  }, [proposal?.startTime, proposal?.startBlock]);

  const supportNeeded = useMemo(
    () =>
      bignumber(proposal?.majorityPercentage || 0)
        .div(totalVotingPower)
        .mul(100)
        .toFixed(9),
    [proposal, totalVotingPower],
  );

  const vpNeeded = useMemo(
    () =>
      bignumber(proposal?.quorum || 0)
        .div(totalVotingPower)
        .mul(100)
        .toFixed(9),
    [proposal, totalVotingPower],
  );

  const votesCast = useMemo(
    () =>
      bignumber(proposal?.forVotes || 0)
        .add(proposal?.againstVotes || 0)
        .toString(),
    [proposal],
  );

  const forPercent = useMemo(
    () =>
      bignumber(proposal?.forVotes || 0)
        .div(votesCast)
        .mul(100)
        .toFixed(9),
    [proposal, votesCast],
  );

  const votedPercent = useMemo(
    () => bignumber(votesCast).div(totalVotingPower).mul(100).toFixed(2),
    [votesCast, totalVotingPower],
  );

  const isActive = [ProposalState.Active, ProposalState.Pending].includes(
    state,
  );

  const outcome = useMemo(() => {
    if (state === ProposalState.Canceled) {
      return 'Vetoed';
    }
    if (
      bignumber(forPercent).greaterThan(supportNeeded) &&
      bignumber(votesCast).greaterThan(proposal?.quorum || 0)
    ) {
      return isActive ? 'Will succeed' : 'Succeeded';
    }
    return isActive ? 'Will be defeated' : 'Defeated';
  }, [proposal, forPercent, supportNeeded, votesCast, state, isActive]);

  if (loading || !proposal) {
    return <div className="skeleton">Loading, please wait...</div>;
  }

  return (
    <>
      <p className="text-sm tracking-normal leading-3 pt-3">
        <span className="text-white">Support Required: </span>
        <span className="text-gold">
          &gt;{Number(supportNeeded).toFixed(2)}%
        </span>
      </p>
      <p className="text-sm tracking-normal leading-3 pt-3">
        <span className="text-white">VP needed for quorum: </span>
        <span className="text-gold">
          &gt;{kFormatter(Number(proposal.quorum) / 1e18)} (&gt;
          {Number(vpNeeded).toFixed(2)}%)
        </span>
      </p>
      <p className="text-sm tracking-normal leading-3 pt-3">
        <span className="text-white">VP turnout: </span>
        <span className="text-gold">
          {kFormatter(Number(votesCast) / 1e18)} ({votedPercent}%)
        </span>
      </p>
      <p className="text-sm tracking-normal leading-3 pt-3">
        <span className="text-white">
          {isActive ? 'Current outcome' : 'Outcome'}:
        </span>
        <span className="text-gold">{outcome}</span>
      </p>
    </>
  );
};
