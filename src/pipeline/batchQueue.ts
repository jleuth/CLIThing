export type Task<T> = () => Promise<T>

export class BatchQueue<T = unknown> {
    private queue: Task<T>[] = []
    private running = false
    
    add(task: Task<T>) {
        this.queue.push(task)
        this.process()
    }

    private async process() {
        if (this.running) return
        this.running = true
        while (this.queue.length > 0) {
            const task = this.queue.shift()!
            try {
                await task()
            } catch {
                // screw errors we don't need them where we're going
            }
        }
        this.running = false
    }
}