import { db } from '../db/index.js';
import {
  users,
  workspaces,
  workspaceMembers,
  channels,
  agents,
  workspaceAgents,
  canvasNodes,
  messages,
  claims,
  validatedFacts,
} from '../db/schema/index.js';
import { hashPassword } from '../services/crypto.js';
import { randomUUID } from 'node:crypto';

async function seed() {
  console.log('🌱 Starting seed...');

  // Guard against running in production
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ Seed cannot run in production');
    process.exit(1);
  }

  // Create demo user (password meets 12-char minimum from validation schema)
  const passwordHash = await hashPassword('demopass12345!');
  const [demoUser] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      username: 'demo',
      passwordHash,
      displayName: 'Demo User',
      avatarUrl: null,
      settings: { defaultViewMode: 'structured', theme: 'system', claimHighlightStyle: 'subtle' },
    })
    .returning();

  console.log('✅ Created demo user:', demoUser.username);

  // Create workspace (matches workspaces schema — no slug, correct settings shape)
  const [workspace] = await db
    .insert(workspaces)
    .values({
      id: randomUUID(),
      name: 'Demo Workspace',
      description: 'A demo workspace to explore AI Desktop features',
      defaultViewMode: 'structured',
      settings: { agentAutoParticipate: false, claimValidationRequired: false },
      createdBy: demoUser.id,
    })
    .returning();

  console.log('✅ Created workspace:', workspace.name);

  // Add user as owner
  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: demoUser.id,
    role: 'owner',
  });

  // Create default channel
  const [generalChannel] = await db
    .insert(channels)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      name: 'general',
      description: 'General discussion',
      isDefault: true,
    })
    .returning();

  console.log('✅ Created channel:', generalChannel.name);

  // Create demo agent (isActive is boolean in schema)
  const [agent] = await db
    .insert(agents)
    .values({
      id: randomUUID(),
      name: 'Atlas',
      avatarUrl: null,
      systemPrompt:
        'You are Atlas, a helpful AI assistant in the AI Desktop environment. You help users with tasks, answer questions, and collaborate on projects. Be concise but thorough.',
      model: 'anthropic/claude-3.5-sonnet',
      capabilities: ['chat', 'code', 'research'],
      isActive: true,
      createdBy: demoUser.id,
      // Note: In production, user would provide their own API key
      openrouterApiKeyEncrypted: null,
    })
    .returning();

  // Add agent to workspace
  await db.insert(workspaceAgents).values({
    workspaceId: workspace.id,
    agentId: agent.id,
  });

  console.log('✅ Created agent:', agent.name);

  // Create sample canvas nodes
  await db
    .insert(canvasNodes)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title: 'Project Alpha',
      description: 'Main project node',
      positionX: 400,
      positionY: 300,
      width: 250,
      height: 180,
      style: { color: '#3b82f6', shape: 'rounded' },
      createdBy: demoUser.id,
    })
    .returning();

  await db
    .insert(canvasNodes)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title: 'Tasks',
      description: 'Project tasks and milestones',
      positionX: 700,
      positionY: 200,
      width: 200,
      height: 150,
      style: { color: '#10b981', shape: 'rectangle' },
      createdBy: demoUser.id,
    })
    .returning();

  await db
    .insert(canvasNodes)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      title: 'Notes',
      description: 'Meeting notes and ideas',
      positionX: 700,
      positionY: 400,
      width: 200,
      height: 150,
      style: { color: '#f59e0b', shape: 'rectangle' },
      createdBy: demoUser.id,
    })
    .returning();

  console.log('✅ Created canvas nodes');

  // Create sample messages
  await db
    .insert(messages)
    .values({
      id: randomUUID(),
      channelId: generalChannel.id,
      authorType: 'agent',
      authorId: agent.id,
      content: `Welcome to AI Desktop! 👋

I'm **Atlas**, your AI assistant. Here's what you can do:

• **Chat** - Just type a message and I'll help you
• **Canvas** - Switch to Creative View to organize ideas visually
• **Claim Validation** - I'll highlight claims that need verification

Try asking me anything!`,
    })
    .returning();

  await db
    .insert(messages)
    .values({
      id: randomUUID(),
      channelId: generalChannel.id,
      authorType: 'user',
      authorId: demoUser.id,
      content: 'What can you help me with?',
    })
    .returning();

  const [agentResponse] = await db
    .insert(messages)
    .values({
      id: randomUUID(),
      channelId: generalChannel.id,
      authorType: 'agent',
      authorId: agent.id,
      content: `Great question! Here are some things I can help with:

1. **Research & Analysis** - I can search for information and provide summaries
2. **Code Assistance** - Help with debugging, writing, or explaining code
3. **Document Drafting** - Create outlines, reports, or documentation
4. **Brainstorming** - Generate ideas and explore possibilities
5. **Task Planning** - Break down projects into actionable steps

Just ask, and I'll do my best to assist!`,
    })
    .returning();

  console.log('✅ Created sample messages');

  // Create sample claim (textStart/textEnd are required integer fields)
  const [claim] = await db
    .insert(claims)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      messageId: agentResponse.id,
      content:
        'AI Desktop supports both Structured and Creative view modes for different workflows.',
      textStart: 0,
      textEnd: 84,
      claimType: 'factual',
      status: 'unvalidated',
    })
    .returning();

  console.log('✅ Created sample claim');

  // Create sample validated fact
  await db
    .insert(validatedFacts)
    .values({
      id: randomUUID(),
      workspaceId: workspace.id,
      claimId: claim.id,
      content: 'Demo workspace was created on ' + new Date().toISOString().split('T')[0],
      isActive: true,
    })
    .returning();

  console.log('✅ Created sample validated fact');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Demo credentials:');
  console.log('   Username: demo');
  console.log('   Password: demopass12345!');
  console.log('\n⚠️  Remember to set your OpenRouter API key in the agent settings!');
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
