# Updating the [input schema](https://docs.subsquid.io/basics/schema-file/)

You'll often want to update the input schema (which affects the final GraphQL API and the PostgreSQL database schema) when adding new features to Orion.

## Adding individual fields

Let's imagine that you want to add a new field to the `Video` entity, called `spamProbabilityScore` which would indicate how likely it is that the video is a spam (it could be calculated by some ML model which would assess the probability based on the video metadata for example).

In order to do that, you'll need to:

1. Add the field to the `Video` entity inside `schema/videos.graphql`, ie.:
    ```graphql
    type Video @entity {
        "Runtime identifier"
        id: ID!
        
        # ...
        
        "Probability that the video is a spam based on the metadata (0-100)"
        spamProbabilityScore: Int!
    }
    ```
2. Update the autogenerated TypeORM models by running `make codegen` (this will update the `video.model.ts` file inside `src/model/generated` directory)
3. Re-build the project by running `make build`
4. Re-generate the `*-Data.js` migration inside `db/migrations`:
    ```bash
    # First, remove the old migration file(s)
    rm db/migrations/*-Data.js
    # Start PostgreSQL database service
    # Make sure it's an empty database! If the service is already running you should first run:
    # docker-compose down -v
    docker-compose up -d orion_db
    # Generate the new migration
    make dbgen
    ```
5. You can now update the event handlers like `processVideoCreatedEvent` and `processVideoUpdatedEvent` to include the logic associated with the new field:
    ```typescript
    export async function processVideoCreatedEvent(/* ... */): Promise<void> {
      /* ... */
      const video = overlay.getRepository(Video).new(/* ... */)
      /* ... */
      video.spamProbabilityScore = calculateSpamProbabilityScore(video)
    }
    
    export async function processVideoUpdatedEvent(/* ... */): Promise<void> {
      /* ... */
      const video = await overlay.getRepository(Video).getByIdOrFail(contentId.toString())
      /* ... */
      video.spamProbabilityScore = calculateSpamProbabilityScore(video)
    }
    ```

Now you should be able to use `spamProbabilityScore` field as part of the GraphQL queries such as `videos`, `videoById`, `videoByUniqueInput` and `videosConnection`, for example:
```graphql
  query LikelySpamVideos {
    videos(where: { spamProbabilityScore_gt: 80 }, orderBy: spamProbabilityScore_DESC) {
        id
        title
        description
        spamProbabilityScore
    }
  }
```

## Adding entities

The flow of adding new entities to the input schema is quite similar to adding individual fields. In order to better understand the syntax, you should familiarize yourself with the Subsquid documentation about [entities](https://docs.subsquid.io/basics/schema-file/entities/).

When adding new entities, it's usually also important to consider whether they should be exposed publically or not. **By default all entities are public**, to understand how you can change that, see the [Entity visibility guide](./entity-visibility.md).