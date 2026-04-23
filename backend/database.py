import asyncpg
from typing import Optional

class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        # We connect to the postgres instance running via docker at 127.0.0.1:5432
        self.pool = await asyncpg.create_pool(
            user='postgres',
            password='password',
            database='postgres',
            host='127.0.0.1',
            port=5432,
            min_size=1,
            max_size=10
        )

    async def disconnect(self):
        if self.pool:
            await self.pool.close()

db = Database()
