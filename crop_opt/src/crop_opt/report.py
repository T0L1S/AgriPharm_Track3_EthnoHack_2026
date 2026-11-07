'''This code was written by a human, for questions ask T0L1S'''
from iteround import saferound 
#print the results
#round the output to 3 digits, does not make a difference
def show(x, u, s, plants, cycle, demand, land_cnstr):
	for t in range(1, 4):
		stock = {}
		sown = {}
		served = {}
		covered = {}
		for p in plants:
			covered[p] = sum(u[p, y].varValue for y in range(12 * (t-1), 12 * t))
		covered = saferound(covered, 3)

		for p in plants:
			stock[p] = saferound([s[p, y].varValue for y in range(12 * (t-1), 12 *t)], 3)
			sown[p] = saferound([x[p, y].varValue for y in range(12 * (t-1), 12 * t)], 3)
			served[p] = saferound([u[p, y].varValue for y in range(12 * (t-1), 12 * t)], 3)

		for m in range(12 * (t-1), 12 * t):
			occupied = {}
			for p in plants:
				print(f"Sown_{p}_{m + 1} = {abs(sown[p][m%12])}")
				print(f"Served_{p}_{m + 1} = {abs(served[p][m%12])}")
				print(f"Stock_{p}_{m + 1} = {abs(stock[p][m%12])}")
				occupied[p] = sum(x[p, m - k].varValue for k in range(cycle[p]) if m >= k)

			occupied["Idle_Land"] = land_cnstr - sum(occupied.values())
			occupied = saferound(occupied, 3)
			
			for p in plants:
				print(f"Occupied_{p}_{m + 1} = {abs(occupied[p])}")
			print(f"Idle_Land_{m + 1} = {abs(occupied["Idle_Land"])}")


					
		print(f"Year_{t}: {sum(covered.values()) / sum(sum(demand[p]) for p in plants) * 100}")
