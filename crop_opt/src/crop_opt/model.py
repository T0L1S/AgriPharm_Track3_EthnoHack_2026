'''This code was written by a human, for questions ask T0L1S'''
import pulp

T = range(48)
EPS = 0.001			#greek epsilon for a small number :)


def has_drought(time, plnt, cycle, constraints):
	if (time < cycle[plnt]): return False

	for m in range(1, cycle[plnt] + 1):
		month = time - m
		if (constraints["drought_start"] <= month % 12 <= constraints["drought_end"]):
			return True

	return False

#run the solver
def optimize(demand, plants, cycle, constraints, init_stock, fixed=None, drought_fctr=None, lp_file="solution.lp", solver=None):

	cropoptim = pulp.LpProblem("Crop_Optimization_Problem", pulp.LpMaximize)

	keys_tmp = [(p, t) for p in plants for t in T]
	x = cropoptim.add_variable_dicts("Area", keys_tmp, lowBound = 0, cat = pulp.LpContinuous)
	u = cropoptim.add_variable_dicts("Covered", keys_tmp, lowBound = 0, cat = pulp.LpContinuous)
	s = cropoptim.add_variable_dicts("Stock", keys_tmp, lowBound = 0, cat = pulp.LpContinuous)

	cropoptim += pulp.lpSum(plants[p]["weight"] * u[p, t] - EPS * s[p, t]  for p in plants for t in T)  #what we want to maximize
	

#constraints
	for t in T:
		for p in plants:
			cropoptim += u[p, t] <= demand[p][t%12]
			prev = s[p, t-1] if t > 0 else init_stock[p]
			harv = plants[p]["yield_kg"] * x[p, (t - cycle[p])] if t >= cycle[p] else 0
			if drought_fctr is not None:
				if (has_drought(t, p, cycle, constraints)):
					harv = harv * drought_fctr
			cropoptim += s[p, t] == prev + harv - u[p, t]
		if fixed is None:
			cropoptim += pulp.lpSum(x[p, (t - k)] for p in plants for k in range(cycle[p]) if t - k >= 0) <= constraints["land"]


	for p in plants:
		for t in T:
			if (plants[p]["sown_from"] <= plants[p]["sown_to"]):
				if ((plants[p]["sown_from"] > t % 12) or (plants[p]["sown_to"] < t % 12)):
					cropoptim += x[p, t] == 0
			else:
				if ((plants[p]["sown_from"] > t % 12) and (plants[p]["sown_to"] < t % 12)):
					cropoptim += x[p, t] == 0

#for drought scenarios
	if fixed is not None:
		for key in fixed:
			cropoptim += x[key] <= fixed[key]
			cropoptim += x[key] >= fixed[key] - 1e-6

	if lp_file is not None:
		cropoptim.writeLP(lp_file)
	stats = cropoptim.solve() if solver is None else cropoptim.solve(solver)

	if stats.status_str != "Optimal":
		raise RuntimeError(f"No Solution: {stats.status_str}")
	else:
		print("Status:", stats.status_str)

	return x, u, s, cropoptim
