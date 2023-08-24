import { ConfigVariable, config } from '../utils/config'
import schedule from 'node-schedule'
import { globalEm } from '../utils/globalEm'
import {
  EmailDeliveryStatus,
  NotificationEmailDelivery,
  fromJsonEmailDeliveryStatus,
} from '../model'
import { FindOptionsWhere } from 'typeorm'
import { createMailContent, executeMailDelivery } from './utils'

// Function to send new data
export async function sendNew() {
  const em = await globalEm
  console.log('Sending new emails')
  const newEmailDeliveries = await em.getRepository(NotificationEmailDelivery).find({
    where: {
      deliveryStatus: fromJsonEmailDeliveryStatus({
        isTypeOf: 'Unsent',
        phantom: undefined,
      }) as unknown as FindOptionsWhere<EmailDeliveryStatus>,
    },
    relations: { notification: { account: true } },
  })
  for (const notificationDelivery of newEmailDeliveries) {
    const toAccount = notificationDelivery.notification.account
    const notification = notificationDelivery.notification
    const appName = await config.get(ConfigVariable.AppName, em)
    const content = await createMailContent(em, toAccount, appName, notification)
    notificationDelivery.deliveryStatus = await executeMailDelivery(appName, em, toAccount, content)
  }
  await em.save(newEmailDeliveries)
}

// Function to send failed data
function sendFailed() {
  console.log('Sending failed data...')
  // Implement your logic here
}

// Schedule the tasks
schedule.scheduleJob('0 12 * * *', sendNew) // Everyday at 12:00 PM
schedule.scheduleJob('0 0,12 * * *', sendFailed) // Everyday at 12:00 AM and 12:00 PM
