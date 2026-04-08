import 'dotenv/config'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

import { schema as createIntentSchema,    handler as createIntentHandler    } from './tools/create_intent.js'
import { schema as reviewIntentSchema,    handler as reviewIntentHandler    } from './tools/review_intent.js'
import { schema as executePaymentSchema,  handler as executePaymentHandler  } from './tools/execute_payment.js'
import { schema as getPolicySchema,       handler as getPolicyHandler       } from './tools/get_policy.js'
import { schema as queryAuditLogSchema,   handler as queryAuditLogHandler   } from './tools/query_audit_log.js'
import { schema as getTxStatusSchema,     handler as getTxStatusHandler     } from './tools/get_tx_status.js'

const API_BASE = `http://localhost:${process.env.API_PORT || 3002}`

const server = new McpServer({
  name: 'haven',
  version: '1.0.0',
})

const tools = [
  { schema: createIntentSchema,   handler: createIntentHandler   },
  { schema: reviewIntentSchema,   handler: reviewIntentHandler   },
  { schema: executePaymentSchema, handler: executePaymentHandler },
  { schema: getPolicySchema,      handler: getPolicyHandler      },
  { schema: queryAuditLogSchema,  handler: queryAuditLogHandler  },
  { schema: getTxStatusSchema,    handler: getTxStatusHandler    },
]

for (const { schema, handler } of tools) {
  server.tool(schema.name, schema.description, {}, async (params) => {
    const result = await handler(params, API_BASE)
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    }
  })
}

const transport = new StdioServerTransport()
await server.connect(transport)
console.error('HAVEN MCP server running')
