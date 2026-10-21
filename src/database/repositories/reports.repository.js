
import { getDatabase } from "../index";

const dateTime = date => {
    const p = n => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
};

export function getReportRange(period = "MONTH") {
    const now = new Date();
    const start = new Date(now);

    start.setHours(0, 0, 0, 0);

    if (period === "WEEK") {
        const day = (start.getDay() + 6) % 7;
        start.setDate(start.getDate() - day);
    } else if (period === "MONTH") {
        start.setDate(1);
    } else if (period === "YEAR") {
        start.setMonth(0, 1);
    }

    const end = new Date(now);

    return {
        start: dateTime(start),
        end: dateTime(end),
        startDate: start,
        endDate: end,
    };
}

function occupiedMilliseconds(stays, start, end) {
    const byRoom = new Map();

    for (const stay of stays) {
        const from = Math.max(
            new Date(stay.check_in_at).getTime(),
            start.getTime()
        );

        const to = Math.min(
            new Date(
                stay.actual_check_out_at ||
                (stay.status === "ACTIVE"
                    ? end
                    : stay.scheduled_check_out_at)
            ).getTime(),
            end.getTime()
        );

        if (!Number.isFinite(from) ||
            !Number.isFinite(to) ||
            to <= from) continue;

        const intervals = byRoom.get(stay.room_id) || [];
        intervals.push([from, to]);
        byRoom.set(stay.room_id, intervals);
    }

    let total = 0;

    for (const intervals of byRoom.values()) {
        intervals.sort((a, b) => a[0] - b[0]);

        let [from, to] = intervals[0];

        for (let i = 1; i < intervals.length; i++) {
            const [nextFrom, nextTo] = intervals[i];

            if (nextFrom <= to) {
                to = Math.max(to, nextTo);
            } else {
                total += to - from;
                [from, to] = [nextFrom, nextTo];
            }
        }

        total += to - from;
    }

    return total;
}

export async function getHotelReport(period = "MONTH") {
    const db = await getDatabase();
    const range = getReportRange(period);
    const { start, end, startDate, endDate } = range;

    const [
        reservations,
        stays,
        rooms,
        payments,
        manualMovements,
    ] = await Promise.all([
        db.getAllAsync(
            `SELECT id, status, room_id, agreed_price_cents,
                    created_at
             FROM reservations
             WHERE created_at >= ? AND created_at <= ?`,
            [start, end]
        ),
        db.getAllAsync(
            `SELECT id, room_id, status, check_in_at,
                    scheduled_check_out_at, actual_check_out_at
             FROM stays
             WHERE status IN ('ACTIVE', 'COMPLETED')
               AND check_in_at <= ?
               AND (
                    actual_check_out_at IS NULL
                    OR actual_check_out_at >= ?
               )`,
            [end, start]
        ),
        db.getAllAsync(
            `SELECT id, number, is_active
             FROM rooms`
        ),
        db.getAllAsync(
            `SELECT id, amount_cents, method, type, created_at
             FROM payments
             WHERE created_at >= ? AND created_at <= ?`,
            [start, end]
        ),
        db.getAllAsync(
            `SELECT m.id, m.type, m.amount_cents,
                    m.payment_method, m.created_at
             FROM cash_movements m
             LEFT JOIN payments p
               ON p.cash_movement_id = m.id
             WHERE m.created_at >= ?
               AND m.created_at <= ?
               AND p.id IS NULL`,
            [start, end]
        ),
    ]);

    const net = item =>
        item.type === "REFUND"
            ? -item.amount_cents
            : item.amount_cents;

    const paymentsTotal = payments.reduce(
        (sum, item) => sum + net(item),
        0
    );

    const byMethod = {};

    for (const item of payments) {
        byMethod[item.method] =
            (byMethod[item.method] || 0) + net(item);
    }

    let manualIncome = 0;
    let manualExpense = 0;

    for (const item of manualMovements) {
        if (item.type === "INCOME") {
            manualIncome += item.amount_cents;
        } else {
            manualExpense += item.amount_cents;
        }
    }

    const roomCount = rooms.filter(
        room => room.is_active === 1
    ).length;

    const duration = Math.max(
        0,
        endDate.getTime() - startDate.getTime()
    );

    const occupied = occupiedMilliseconds(
        stays,
        startDate,
        endDate
    );

    const occupancy =
        roomCount > 0 && duration > 0
            ? Math.min(
                100,
                (occupied / (roomCount * duration)) * 100
            )
            : 0;

    const roomStats = new Map(
        rooms.map(room => [
            room.id,
            {
                id: room.id,
                number: room.number,
                stays: 0,
            },
        ])
    );

    for (const stay of stays) {
        const room = roomStats.get(stay.room_id);
        if (room) room.stays++;
    }

    return {
        period,
        range,
        paymentsTotal,
        manualIncome,
        manualExpense,
        netCashFlow:
            paymentsTotal + manualIncome - manualExpense,
        reservationsCount: reservations.length,
        cancelledCount: reservations.filter(
            item => item.status === "CANCELLED"
        ).length,
        completedStays: stays.filter(
            item =>
                item.status === "COMPLETED" &&
                item.actual_check_out_at &&
                item.actual_check_out_at >= start &&
                item.actual_check_out_at <= end
        ).length,
        activeStays: stays.filter(
            item => item.status === "ACTIVE"
        ).length,
        roomCount,
        occupancy,
        byMethod: Object.entries(byMethod)
            .map(([method, amount]) => ({
                method,
                amount,
            }))
            .sort((a, b) => b.amount - a.amount),
        topRooms: [...roomStats.values()]
            .filter(item => item.stays > 0)
            .sort((a, b) => b.stays - a.stays)
            .slice(0, 5),
    };
}