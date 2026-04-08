export async function append(event_type, task_id, payload) {
  console.log(JSON.stringify({ ts: Date.now(), event_type, task_id, payload }))
}
