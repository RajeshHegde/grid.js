const uuid = require('uuid/v4');

// Get the plans of a user given an instanceId and protocolId
// If they also pass a scopeId, they must
export const getPlans = async (db, data) => {
  console.log('data', data);
  let { instanceId, scopeId, protocolId } = data;

  const participants = [];

  if (!instanceId) return { error: 'Please supply an instanceId' };
  if (!protocolId) return { error: 'Please supply a protocolId' };

  // Get the protocol of that user
  const protocol = await db
    .get('protocols')
    .find({ id: user.protocolId })
    .value();

  console.log('protocol', protocol);

  // If we don't have a scopeId, we must be creating a new one
  if (!scopeId) {
    // Give this new scope an id
    scopeId = uuid();

    console.log('new scope id', scopeId);

    // Update the user creating this new scope to be the creator and assign them the 0th list of plans
    await db
      .get('users')
      .find({ instanceId, protocolId })
      .assign({
        scopeId,
        role: 'creator',
        plan: 0
      })
      .write();

    // Create all the other participants (protocol.plans.length - 1 since the first is the scope creator)
    await [...Array(protocol.plans.length - 1)].forEach(async (_, i) => {
      // For each user create an id and push them onto the participants list
      const participantId = uuid();
      participants.push(participantId);

      console.log('new participant', participantId);

      // Put them in the users database as a participant and assign them a list of plans
      await db
        .get('users')
        .push({
          instanceId: participantId,
          protocolId,
          scopeId,
          role: 'participant',
          plan: i + 1
        })
        .write();
    });
  }

  // Get the user
  const user = await db
    .get('users')
    .find({ instanceId, scopeId, protocolId })
    .value();

  console.log('user', user);

  // If we didn't just create the scope, make sure we always return the list of other participants
  if (participants.length === 0) {
    const otherParticipants = await db
      .get('users')
      .find({ scopeId, protocolId })
      .value();

    console.log('other participants', otherParticipants);

    otherParticipants.forEach(participant => {
      if (participant.instanceId !== instanceId) {
        participants.push(participant.instanceId);
      }
    });
  }

  console.log('participants', participants);

  // Return the user, their assigned scopeId (passed to us or freshly created), their list of plans, and the other participants
  return { user, plans: protocol.plans[user.plan], participants };
};
