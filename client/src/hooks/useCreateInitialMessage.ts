import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Constants, EModelEndpoint } from 'librechat-data-provider';
import { useChatContext, useAgentsMapContext } from '~/Providers';
import { useCreateInitialMessageMutation } from '~/data-provider/Messages';
import useNavigateToConvo from '~/hooks/Conversations/useNavigateToConvo';
import { isEphemeralAgent } from '~/common';

/**
 * When on the landing page with an agent that has initial_message configured,
 * creates a new conversation with the initial message persisted and navigates to it.
 * Runs only once per mount when conditions are met.
 */
export default function useCreateInitialMessage() {
  const { conversationId } = useParams();
  const { conversation, index } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const { navigateToConvo } = useNavigateToConvo(index);
  const createInitialMessage = useCreateInitialMessageMutation();
  const hasTriggered = useRef(false);

  const agentId = conversation?.agent_id;
  const agent = agentId && agentsMap ? agentsMap[agentId] : undefined;
  const initialMessage = agent?.initial_message?.trim();

  const shouldCreate =
    (conversationId === Constants.NEW_CONVO || !conversationId) &&
    conversation?.endpoint === EModelEndpoint.agents &&
    agentId &&
    !isEphemeralAgent(agentId) &&
    !!initialMessage &&
    !createInitialMessage.isPending &&
    !createInitialMessage.isSuccess;

  useEffect(() => {
    if (!shouldCreate || hasTriggered.current) {
      return;
    }
    hasTriggered.current = true;

    const payload = {
      agent_id: agentId as string,
      initial_message: initialMessage as string,
      title: conversation?.title ?? undefined,
    };

    createInitialMessage.mutate(payload, {
      onSuccess: (data) => {
        if (data.conversation?.conversationId) {
          navigateToConvo(data.conversation);
        }
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hasTriggered ref prevents duplicate calls; mutate is stable
  }, [shouldCreate, agentId, initialMessage, conversation?.title, navigateToConvo]);
}
