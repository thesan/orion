import { RequestCheckFunction } from '@subsquid/graphql-server/lib/check'
import { Context as OpenreaderContext } from '@subsquid/openreader/lib/context'
import { TypeormOpenreaderContext } from '@subsquid/graphql-server/lib/typeorm'
import { AuthContext, authenticate } from '../utils/auth'
import { UnauthorizedError } from 'type-graphql'

export type Context = OpenreaderContext & AuthContext

const autogeneratedOperatorQueries = [
  'reports',
  'reportById',
  'reportsConnection',
  'reportByUniqueInput',
  'videoViewEvents',
  'videoViewEventById',
  'videoViewEventByUniqueInput',
  'videoViewEventsConnection',
  'channelFollows',
  'channelFollowById',
  'channelFollowByUniqueInput',
  'channelFollowsConnection',
  'nftFeaturingRequests',
  'nftFeaturingRequestById',
  'nftFeaturingRequestsConnection',
]

export const requestCheck: RequestCheckFunction = async (ctx) => {
  const context = ctx.context as Context

  const authContext = await authenticate(context.req, 'cookie')

  Object.assign(context, authContext)

  if (
    (!authContext || !authContext.user.isRoot) &&
    ctx.operation.selectionSet.selections.some(
      (s) => s.kind === 'Field' && autogeneratedOperatorQueries.includes(s.name.value)
    )
  ) {
    throw new UnauthorizedError()
  }

  // Set search_path accordingly if it's an operator request
  if (authContext?.user.isRoot) {
    const em = await (context.openreader as unknown as TypeormOpenreaderContext).getEntityManager()
    await em.query('SET LOCAL search_path TO admin,public')
  }

  return true
}

export default requestCheck
