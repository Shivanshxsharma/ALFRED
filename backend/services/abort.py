import asyncio
_cancel_events: dict[str, asyncio.Event] = {}