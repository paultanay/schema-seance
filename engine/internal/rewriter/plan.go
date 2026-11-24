package rewriter

import "encoding/json"

type RewritePlan struct {
	Phase1 []string `json:"phase1"`
	Phase2 []string `json:"phase2"`
	Phase3 []string `json:"phase3"`
}

func (p *RewritePlan) Marshal() ([]byte, error) {
	return json.Marshal(p)
}
