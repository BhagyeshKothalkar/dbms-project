from typing import Optional
import os
import asyncpg


class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        self.pool = await asyncpg.create_pool(
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            host="db",
            port=os.getenv("DB_PORT"),
            min_size=1,
            max_size=10,
        )

    async def disconnect(self):
        if self.pool:
            await self.pool.close()


db = Database()
