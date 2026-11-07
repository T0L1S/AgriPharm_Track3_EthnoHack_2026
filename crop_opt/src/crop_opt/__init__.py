import sys

from .inputs import InputError, load_inputs, validate_inputs
from .model import T, EPS, has_drought, optimize
from .report import show


#runs both scenarios on the CSVs in folder (default: the folder given on the command line, else the current one)
def main(folder=None):
	if folder is None:
		folder = sys.argv[1] if len(sys.argv) > 1 else "."

	try:
		plants, cycle, constraints, demand, init_stock = load_inputs(folder)
	except InputError as err:
		sys.exit(f"Input error: {err}")

	#run solver
	x, u, s, cropoptim = optimize(demand, plants, cycle, constraints, init_stock, lp_file="solution.lp")

	show(x, u, s, plants, cycle, demand, constraints["land"])

	if "drought" not in constraints:
		return					#no drought columns in constraints.csv: skip the drought scenario

	plan_fix = {}
	for key in x:
		plan_fix[key] = max(0.0, x[key].varValue)

	#run for drought
	x, u, s, cropoptim = optimize(demand, plants, cycle, constraints, init_stock, fixed=plan_fix, drought_fctr=constraints["drought"], lp_file="solution_drought.lp")
	show(x, u, s, plants, cycle, demand, constraints["land"])
