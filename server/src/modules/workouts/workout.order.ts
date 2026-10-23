// Move through a free position so immediate UNIQUE(session_id, position)
// constraints are respected even for cycles such as [A,B,C] -> [C,A,B].
export function planPositionChanges(rows: { id: string; position: number }[], ids: string[]) {
    if (ids.length !== rows.length || new Set(ids).size !== ids.length || ids.some(id => !rows.some(row => row.id === id))) {
        throw new Error("Exercise list changed. Reload the workout and try again.");
    }
    const positions = new Map(rows.map(row => [row.id, row.position]));
    const changes: { id: string; from: number; to: number }[] = [];
    const spare = Math.max(ids.length, ...rows.map(row => row.position + 1));
    const move = (id: string, to: number) => {
        changes.push({ id, from: positions.get(id)!, to });
        positions.set(id, to);
    };
    while (ids.some((id, index) => positions.get(id) !== index)) {
        const occupied = new Set(positions.values());
        const freeTarget = ids.findIndex((id, index) => positions.get(id) !== index && !occupied.has(index));
        if (freeTarget >= 0) move(ids[freeTarget], freeTarget);
        else move(ids.find((id, index) => positions.get(id) !== index)!, spare);
    }
    return changes;
}
